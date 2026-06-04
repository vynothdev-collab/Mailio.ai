import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Track when an admin first opened a ticket and when any admin last viewed it.
 * Used by the helpdesk UI to highlight "new for admin" tickets.
 *
 * Safe to run on existing data — both columns are nullable, no backfill needed.
 */
export class AddTicketAdminViewTracking1780300000002 implements MigrationInterface {
  name = 'AddTicketAdminViewTracking1780300000002';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS first_admin_opened_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS last_admin_viewed_at  TIMESTAMPTZ NULL
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS last_admin_viewed_at,
        DROP COLUMN IF EXISTS first_admin_opened_at
    `);
  }
}
