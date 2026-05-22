import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailAddressLookupIndex1736000000008
  implements MigrationInterface
{
  name = 'AddEmailAddressLookupIndex1736000000008';
  transaction = false as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_emails_address_completed"
       ON "emails" ("address", "processed_at" DESC)
       WHERE status = 'COMPLETED' AND is_deleted = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_emails_address_completed"`,
    );
  }
}
