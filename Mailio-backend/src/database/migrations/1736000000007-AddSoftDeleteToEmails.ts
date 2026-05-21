import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToEmails1736000000007 implements MigrationInterface {
  name = 'AddSoftDeleteToEmails1736000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "emails"
        ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "email_lists"
        ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_emails_user_active"
        ON "emails" ("user_id")
        WHERE "is_deleted" = false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_email_lists_user_active"
        ON "email_lists" ("user_id")
        WHERE "is_deleted" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_email_lists_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_emails_user_active"`);
    await queryRunner.query(`
      ALTER TABLE "email_lists"
        DROP COLUMN IF EXISTS "deleted_at",
        DROP COLUMN IF EXISTS "is_deleted"
    `);
    await queryRunner.query(`
      ALTER TABLE "emails"
        DROP COLUMN IF EXISTS "deleted_at",
        DROP COLUMN IF EXISTS "is_deleted"
    `);
  }
}
