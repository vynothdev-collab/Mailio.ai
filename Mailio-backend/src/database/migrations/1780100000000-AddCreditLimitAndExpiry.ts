import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditLimitAndExpiry1780100000000
  implements MigrationInterface
{
  name = 'AddCreditLimitAndExpiry1780100000000';

  public async up(qr: QueryRunner): Promise<void> {
    // Enterprise: track expiry date and the credits amount purchased in the
    // current billing cycle (used to detect same-amount renewals).
    await qr.query(`
      ALTER TABLE enterprises
        ADD COLUMN IF NOT EXISTS credit_expires_at        TIMESTAMPTZ  NULL,
        ADD COLUMN IF NOT EXISTS total_purchased_credits  BIGINT       NOT NULL DEFAULT 0
    `);

    // Users: per-user credit allocation cap for ENTERPRISE_USER members,
    // and a per-user expiry date (inherits enterprise expiry when NULL).
    await qr.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS credit_limit      BIGINT      NULL,
        ADD COLUMN IF NOT EXISTS credit_expires_at TIMESTAMPTZ NULL
    `);

    // Indexes for the expiry job and allocation queries.
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_enterprises_credit_expiry
        ON enterprises (credit_expires_at)
        WHERE credit_expires_at IS NOT NULL
    `);

    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_users_enterprise_credit_limit
        ON users (enterprise_id, credit_limit)
        WHERE enterprise_id IS NOT NULL
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_enterprises_credit_expiry`);
    await qr.query(`DROP INDEX IF EXISTS idx_users_enterprise_credit_limit`);
    await qr.query(
      `ALTER TABLE enterprises DROP COLUMN IF EXISTS credit_expires_at`,
    );
    await qr.query(
      `ALTER TABLE enterprises DROP COLUMN IF EXISTS total_purchased_credits`,
    );
    await qr.query(`ALTER TABLE users DROP COLUMN IF EXISTS credit_limit`);
    await qr.query(`ALTER TABLE users DROP COLUMN IF EXISTS credit_expires_at`);
  }
}
