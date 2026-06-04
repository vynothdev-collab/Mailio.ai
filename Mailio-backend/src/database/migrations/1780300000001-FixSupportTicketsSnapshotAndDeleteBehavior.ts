import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Production-safe follow-up to `1780300000000-AddSupportTickets`.
 *
 * Goal: preserve ticket history even when the creator is deleted, and add
 * the activity tracking fields used by the new admin UI.
 *
 *   1. Add snapshot columns to `tickets` (nullable first).
 *   2. Backfill snapshot columns from joined `users` / `enterprises` data for
 *      every existing ticket.
 *   3. Promote snapshot columns to NOT NULL (where appropriate) once filled.
 *   4. Drop the `ON DELETE CASCADE` FK on `created_by_user_id` and re-add it
 *      as `ON DELETE SET NULL`, making the column nullable.
 *   5. Add activity-tracking columns (`last_message_at`, `last_message_by_role`,
 *      `admin_unread_count`, `user_unread_count`) plus an index.
 *
 * Safe to run on a DB that already has data — no DROP TABLE, no data loss.
 *
 * Reversible: the `down()` removes the new columns and restores the original
 * NOT NULL + ON DELETE CASCADE on the creator FK. NOTE that going down on a
 * DB where some tickets have a NULL `created_by_user_id` (because the user
 * was deleted after this migration ran) will fail the SET NOT NULL step;
 * operator must triage those rows manually before reverting.
 */
export class FixSupportTicketsSnapshotAndDeleteBehavior1780300000001 implements MigrationInterface {
  name = 'FixSupportTicketsSnapshotAndDeleteBehavior1780300000001';

  public async up(qr: QueryRunner): Promise<void> {
    // ── 1. Add snapshot columns (initially nullable so we can backfill) ──
    await qr.query(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS created_by_name             VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS created_by_email            VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS created_by_role             "public"."tickets_user_role_enum" NULL,
        ADD COLUMN IF NOT EXISTS created_by_enterprise_name  VARCHAR(255) NULL
    `);

    // ── 2. Backfill from the live users / enterprises rows ──────────────
    await qr.query(`
      UPDATE tickets t
         SET created_by_name  = COALESCE(t.created_by_name,  u.name),
             created_by_email = COALESCE(t.created_by_email, u.email),
             created_by_role  = COALESCE(t.created_by_role,  t.user_role)
        FROM users u
       WHERE t.created_by_user_id = u.id
         AND (t.created_by_name IS NULL
              OR t.created_by_email IS NULL
              OR t.created_by_role IS NULL)
    `);
    await qr.query(`
      UPDATE tickets t
         SET created_by_enterprise_name = COALESCE(t.created_by_enterprise_name, e.name)
        FROM enterprises e
       WHERE t.enterprise_id = e.id
         AND t.created_by_enterprise_name IS NULL
    `);
    // Fallbacks for rows where the join didn't find a user (already-deleted users
    // are unlikely on a fresh install but covered defensively).
    await qr.query(`
      UPDATE tickets
         SET created_by_name  = COALESCE(created_by_name,  'Unknown user'),
             created_by_email = COALESCE(created_by_email, 'unknown@unknown'),
             created_by_role  = COALESCE(created_by_role,  user_role)
       WHERE created_by_name IS NULL
          OR created_by_email IS NULL
          OR created_by_role IS NULL
    `);

    // ── 3. Promote backfilled columns to NOT NULL ───────────────────────
    await qr.query(
      `ALTER TABLE tickets ALTER COLUMN created_by_name  SET NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE tickets ALTER COLUMN created_by_email SET NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE tickets ALTER COLUMN created_by_role  SET NOT NULL`,
    );

    // ── 4. Switch creator FK to ON DELETE SET NULL ──────────────────────
    // First drop the existing constraint. The name follows TypeORM's default
    // pattern but we discover it dynamically to be safe across schema drift.
    await qr.query(`
      DO $$
      DECLARE
        cname TEXT;
      BEGIN
        SELECT conname INTO cname
          FROM pg_constraint
         WHERE conrelid = 'tickets'::regclass
           AND contype  = 'f'
           AND conkey   = ARRAY[
             (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'tickets'::regclass
                 AND attname = 'created_by_user_id')
           ];
        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE tickets DROP CONSTRAINT %I', cname);
        END IF;
      END
      $$;
    `);
    await qr.query(
      `ALTER TABLE tickets ALTER COLUMN created_by_user_id DROP NOT NULL`,
    );
    await qr.query(`
      ALTER TABLE tickets
        ADD CONSTRAINT fk_tickets_creator_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    `);

    // ── 5. Activity tracking columns + index ────────────────────────────
    await qr.query(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS last_message_at       TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS last_message_by_role  "public"."ticket_messages_sender_role_enum" NULL,
        ADD COLUMN IF NOT EXISTS admin_unread_count    INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS user_unread_count     INT NOT NULL DEFAULT 0
    `);

    // Seed last_message_at from the latest reply / fall back to created_at
    // so existing rows have a sensible "last activity" value for sort UIs.
    await qr.query(`
      UPDATE tickets t
         SET last_message_at = COALESCE(t.last_message_at, sub.last_msg, t.created_at)
        FROM (
          SELECT ticket_id, MAX(created_at) AS last_msg
            FROM ticket_messages
           WHERE deleted_at IS NULL
           GROUP BY ticket_id
        ) sub
       WHERE t.id = sub.ticket_id
    `);
    await qr.query(`
      UPDATE tickets
         SET last_message_at = created_at
       WHERE last_message_at IS NULL
    `);

    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_last_message
        ON tickets (last_message_at)
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_tickets_last_message`);

    await qr.query(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS user_unread_count,
        DROP COLUMN IF EXISTS admin_unread_count,
        DROP COLUMN IF EXISTS last_message_by_role,
        DROP COLUMN IF EXISTS last_message_at
    `);

    // Restore CASCADE on the creator FK.
    await qr.query(`
      DO $$
      DECLARE
        cname TEXT;
      BEGIN
        SELECT conname INTO cname
          FROM pg_constraint
         WHERE conrelid = 'tickets'::regclass
           AND contype  = 'f'
           AND conkey   = ARRAY[
             (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'tickets'::regclass
                 AND attname = 'created_by_user_id')
           ];
        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE tickets DROP CONSTRAINT %I', cname);
        END IF;
      END
      $$;
    `);
    // Operator must verify there are no NULL created_by_user_id rows before this
    // step; otherwise SET NOT NULL will fail.
    await qr.query(
      `ALTER TABLE tickets ALTER COLUMN created_by_user_id SET NOT NULL`,
    );
    await qr.query(`
      ALTER TABLE tickets
        ADD CONSTRAINT fk_tickets_creator_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    `);

    await qr.query(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS created_by_enterprise_name,
        DROP COLUMN IF EXISTS created_by_role,
        DROP COLUMN IF EXISTS created_by_email,
        DROP COLUMN IF EXISTS created_by_name
    `);
  }
}
