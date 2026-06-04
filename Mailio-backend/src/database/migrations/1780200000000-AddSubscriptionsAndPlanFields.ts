import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 of the mobile-recharge-style billing system.
 *
 *   - Adds the `subscriptions` table (queued/active/expired/cancelled).
 *   - Extends `billing_plans` with `description`, `deleted_at`, and the `BOTH`
 *     audience option on the existing `plan_type` enum.
 *   - Adds `subscription_id` to `credit_transactions` for ledger linkage.
 *   - Adds new `PLAN_PURCHASE / TOPUP_PURCHASE / PLAN_ACTIVATED /
 *     SUBSCRIPTION_EXPIRY` reasons to the credit transaction enum.
 *   - Backfills synthetic ACTIVE subscriptions for accounts that already
 *     hold credit balance + expiry in the legacy flat model — so the new
 *     expiry job sees them.
 */
export class AddSubscriptionsAndPlanFields1780200000000 implements MigrationInterface {
  name = 'AddSubscriptionsAndPlanFields1780200000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ── billing_plans: BOTH audience, description, soft-delete, ───────────
    //    plan_category enum, validity_days nullable ────────────────────────
    await qr.query(`ALTER TYPE "public"."billing_plan_type_enum" ADD VALUE IF NOT EXISTS 'BOTH'`);

    // Create the plan_category enum if it doesn't exist yet. The TypeORM
    // entity has been referencing this for a while but no prior migration
    // actually created the column.
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."billing_plan_category_enum" AS ENUM ('VALIDITY_BASED', 'TOPUP');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await qr.query(`
      ALTER TABLE billing_plans
        ADD COLUMN IF NOT EXISTS description    TEXT NULL,
        ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS plan_category  "public"."billing_plan_category_enum"
          NOT NULL DEFAULT 'VALIDITY_BASED'
    `);

    // Existing rows are validity-based by default. Allow NULL going forward
    // so TOPUP plans can omit the field.
    await qr.query(`
      ALTER TABLE billing_plans
        ALTER COLUMN validity_days DROP NOT NULL
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_plans_not_deleted
        ON billing_plans (is_active)
        WHERE deleted_at IS NULL
    `);

    // ── credit_transactions: subscription_id + new reasons ────────────────
    await qr.query(`
      ALTER TABLE credit_transactions
        ADD COLUMN IF NOT EXISTS subscription_id UUID NULL
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_tx_subscription
        ON credit_transactions (subscription_id)
        WHERE subscription_id IS NOT NULL
    `);

    const newReasons = ['PLAN_PURCHASE', 'TOPUP_PURCHASE', 'PLAN_ACTIVATED', 'SUBSCRIPTION_EXPIRY'];
    for (const r of newReasons) {
      await qr.query(`ALTER TYPE "public"."credit_tx_reason_enum" ADD VALUE IF NOT EXISTS '${r}'`);
    }

    // ── subscriptions table ───────────────────────────────────────────────
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE subscriptions_account_type_enum AS ENUM ('USER', 'ENTERPRISE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE subscriptions_plan_category_enum AS ENUM ('VALIDITY_BASED', 'TOPUP');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE subscriptions_status_enum AS ENUM ('QUEUED', 'ACTIVE', 'EXPIRED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        account_type             subscriptions_account_type_enum NOT NULL,
        user_id                  UUID         NULL REFERENCES users(id)         ON DELETE SET NULL,
        enterprise_id            UUID         NULL REFERENCES enterprises(id)   ON DELETE SET NULL,
        plan_id                  UUID         NOT NULL REFERENCES billing_plans(id) ON DELETE RESTRICT,
        plan_category            subscriptions_plan_category_enum NOT NULL,
        status                   subscriptions_status_enum NOT NULL DEFAULT 'ACTIVE',
        start_date               TIMESTAMPTZ  NOT NULL,
        end_date                 TIMESTAMPTZ  NULL,
        total_credits            BIGINT       NOT NULL,
        used_credits             BIGINT       NOT NULL DEFAULT 0,
        remaining_credits        BIGINT       NOT NULL,
        parent_subscription_id   UUID         NULL REFERENCES subscriptions(id) ON DELETE SET NULL,
        created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        deleted_at               TIMESTAMPTZ  NULL,
        CONSTRAINT chk_sub_account CHECK (
          (account_type = 'USER'       AND user_id       IS NOT NULL AND enterprise_id IS NULL) OR
          (account_type = 'ENTERPRISE' AND enterprise_id IS NOT NULL AND user_id       IS NULL)
        )
      )
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_subs_user_active       ON subscriptions (user_id, status)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_subs_enterprise_active ON subscriptions (enterprise_id, status)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_subs_end_date          ON subscriptions (end_date)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_subs_parent            ON subscriptions (parent_subscription_id)`);

    // ── Backfill synthetic ACTIVE subscriptions for legacy accounts ───────
    // For users with credit_balance > 0 and a credit_expires_at not yet past.
    // We cannot know the plan_id reliably, so we point at users.current_plan_id
    // when set, otherwise the most recently-created VALIDITY_BASED plan.
    await qr.query(`
      WITH plan_choice AS (
        SELECT id FROM billing_plans
        WHERE plan_category = 'VALIDITY_BASED' AND is_active = true AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      )
      INSERT INTO subscriptions (
        account_type, user_id, plan_id, plan_category, status,
        start_date, end_date, total_credits, used_credits, remaining_credits
      )
      SELECT
        'USER',
        u.id,
        COALESCE(u.current_plan_id, (SELECT id FROM plan_choice)),
        'VALIDITY_BASED',
        'ACTIVE',
        COALESCE(u.created_at, now()),
        u.credit_expires_at,
        u.credit_balance + COALESCE(u.credits_used, 0),
        COALESCE(u.credits_used, 0),
        u.credit_balance
      FROM users u
      WHERE u.credit_balance::bigint > 0
        AND u.credit_expires_at IS NOT NULL
        AND u.credit_expires_at > now()
        AND (u.current_plan_id IS NOT NULL OR EXISTS (SELECT 1 FROM plan_choice))
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id AND s.status = 'ACTIVE'
        )
    `);

    await qr.query(`
      WITH plan_choice AS (
        SELECT id FROM billing_plans
        WHERE plan_category = 'VALIDITY_BASED' AND is_active = true AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      )
      INSERT INTO subscriptions (
        account_type, enterprise_id, plan_id, plan_category, status,
        start_date, end_date, total_credits, used_credits, remaining_credits
      )
      SELECT
        'ENTERPRISE',
        e.id,
        (SELECT id FROM plan_choice),
        'VALIDITY_BASED',
        'ACTIVE',
        COALESCE(e.created_at, now()),
        e.credit_expires_at,
        GREATEST(e.total_purchased_credits, e.credit_balance + COALESCE(e.credits_used, 0)),
        COALESCE(e.credits_used, 0),
        e.credit_balance
      FROM enterprises e
      WHERE e.credit_balance::bigint > 0
        AND e.credit_expires_at IS NOT NULL
        AND e.credit_expires_at > now()
        AND e.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM plan_choice)
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.enterprise_id = e.id AND s.status = 'ACTIVE'
        )
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_subs_user_active`);
    await qr.query(`DROP INDEX IF EXISTS idx_subs_enterprise_active`);
    await qr.query(`DROP INDEX IF EXISTS idx_subs_end_date`);
    await qr.query(`DROP INDEX IF EXISTS idx_subs_parent`);
    await qr.query(`DROP TABLE IF EXISTS subscriptions`);
    await qr.query(`DROP TYPE IF EXISTS subscriptions_status_enum`);
    await qr.query(`DROP TYPE IF EXISTS subscriptions_plan_category_enum`);
    await qr.query(`DROP TYPE IF EXISTS subscriptions_account_type_enum`);

    await qr.query(`DROP INDEX IF EXISTS idx_credit_tx_subscription`);
    await qr.query(`ALTER TABLE credit_transactions DROP COLUMN IF EXISTS subscription_id`);

    await qr.query(`DROP INDEX IF EXISTS idx_billing_plans_not_deleted`);
    await qr.query(`ALTER TABLE billing_plans DROP COLUMN IF EXISTS deleted_at`);
    await qr.query(`ALTER TABLE billing_plans DROP COLUMN IF EXISTS description`);
    await qr.query(`ALTER TABLE billing_plans DROP COLUMN IF EXISTS plan_category`);
    await qr.query(`DROP TYPE IF EXISTS "public"."billing_plan_category_enum"`);
    // Restore NOT NULL on validity_days (skip if any row is NULL — operator
    // must handle that manually before reverting).
    await qr.query(`
      ALTER TABLE billing_plans
        ALTER COLUMN validity_days SET NOT NULL
    `);
    // NOTE: Postgres cannot drop an enum value once committed; the `BOTH`
    // audience and new reason enum values stay on rollback. This is safe.
  }
}
