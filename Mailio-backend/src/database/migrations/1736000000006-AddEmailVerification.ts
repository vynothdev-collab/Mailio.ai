import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1736000000006 implements MigrationInterface {
  name = 'AddEmailVerification1736000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "email_verified"    boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "email_verified_at" timestamptz
    `);

    await queryRunner.query(`
      UPDATE "users"
         SET "email_verified" = true,
             "email_verified_at" = COALESCE("email_verified_at", "created_at")
       WHERE "provider" <> 'LOCAL'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "otp_purpose" AS ENUM ('SIGNUP_VERIFY');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_otps" (
        "id"            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"       uuid             NOT NULL,
        "email"         varchar(255)     NOT NULL,
        "otp_hash"      varchar(255)     NOT NULL,
        "purpose"       "otp_purpose"    NOT NULL DEFAULT 'SIGNUP_VERIFY',
        "expires_at"    timestamptz      NOT NULL,
        "consumed_at"   timestamptz,
        "attempt_count" int              NOT NULL DEFAULT 0,
        "created_at"    timestamptz      NOT NULL DEFAULT now(),
        "updated_at"    timestamptz      NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_email_otps_email_purpose"
         ON "email_otps" ("email", "purpose")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_email_otps_email_purpose"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_otps"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "otp_purpose"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "email_verified_at",
        DROP COLUMN IF EXISTS "email_verified"
    `);
  }
}
