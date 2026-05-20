import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAuthProvider1736000000004 implements MigrationInterface {
  name = 'AddUserAuthProvider1736000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_provider" AS ENUM ('LOCAL', 'GOOGLE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "provider"    "auth_provider" NOT NULL DEFAULT 'LOCAL',
        ADD COLUMN IF NOT EXISTS "provider_id" varchar(255),
        ADD COLUMN IF NOT EXISTS "avatar_url"  varchar(512)
    `);

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_provider_provider_id"
         ON "users" ("provider", "provider_id")
         WHERE "provider_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_provider_provider_id"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "avatar_url",
        DROP COLUMN IF EXISTS "provider_id",
        DROP COLUMN IF EXISTS "provider"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "auth_provider"`);
  }
}
