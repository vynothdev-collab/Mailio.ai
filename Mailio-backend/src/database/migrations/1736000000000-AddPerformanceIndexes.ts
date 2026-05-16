import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 0 — adds indexes covering the hot query paths identified in the audit:
 *   - emails(user_id, created_at desc)         dashboard / usage
 *   - emails(list_id, status)                  bulk progress + result export
 *   - emails(user_id, is_single_verify, status) results listing
 *   - email_lists(user_id, status, created_at desc) lists view
 *
 * Uses CREATE INDEX CONCURRENTLY so it is safe on a populated table. This
 * requires the migration to run outside of a transaction.
 */
export class AddPerformanceIndexes1736000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1736000000000';
  transaction = false as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_emails_user_created"
       ON "emails" ("user_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_emails_list_status"
       ON "emails" ("list_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_emails_user_single_status"
       ON "emails" ("user_id", "is_single_verify", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_email_lists_user_status_created"
       ON "email_lists" ("user_id", "status", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_email_lists_user_status_created"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_emails_user_single_status"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_emails_list_status"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_emails_user_created"`,
    );
  }
}
