import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 — email_lists rows now go through an asynchronous parse stage
 * before any verify jobs are enqueued. The upload endpoint returns the
 * jobId immediately with parse_status = PENDING; the csv.parse worker
 * flips it to PARSING during the stream, then to PARSED on completion (or
 * FAILED on error). UI uses this to show "Parsing…" vs "Verifying…".
 *
 * quota_truncated flags lists where the parser stopped inserting before
 * reaching EOF because the user's monthly plan limit was exhausted.
 */
export class AddListParseStatus1736000000002 implements MigrationInterface {
  name = 'AddListParseStatus1736000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent — `synchronize: true` in dev may have already created
    // the type and/or some columns from the entity definition.
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "email_list_parse_status" AS ENUM
          ('PENDING', 'PARSING', 'PARSED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "email_lists"
        ADD COLUMN IF NOT EXISTS "parse_status" "email_list_parse_status" NOT NULL DEFAULT 'PARSED',
        ADD COLUMN IF NOT EXISTS "parse_error" text,
        ADD COLUMN IF NOT EXISTS "quota_truncated" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "duplicates" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "detected_column" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_lists"
        DROP COLUMN IF EXISTS "detected_column",
        DROP COLUMN IF EXISTS "duplicates",
        DROP COLUMN IF EXISTS "quota_truncated",
        DROP COLUMN IF EXISTS "parse_error",
        DROP COLUMN IF EXISTS "parse_status"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "email_list_parse_status"`);
  }
}
