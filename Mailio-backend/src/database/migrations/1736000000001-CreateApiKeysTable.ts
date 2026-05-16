import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — Key Pool registry. Each row represents one runtime-managed
 * credential against an external verification provider. The processor
 * acquires a key per call instead of using a single env-baked secret, so
 * keys can be added / disabled / rotated without redeploy.
 *
 * `key_value` holds the raw secret; if the deployment requires encryption
 * at rest, encrypt at the application layer before insert — the column is
 * intentionally `text` (no pgcrypto requirement).
 */
export class CreateApiKeysTable1736000000001 implements MigrationInterface {
  name = 'CreateApiKeysTable1736000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent — `synchronize: true` in dev may have already created
    // either the type or the table from the entity definition.
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "api_key_status" AS ENUM ('ACTIVE', 'COOLDOWN', 'DISABLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider"       varchar(64) NOT NULL,
        "label"          varchar(255),
        "key_value"      text NOT NULL,
        "status"         "api_key_status" NOT NULL DEFAULT 'ACTIVE',
        "weight"         int NOT NULL DEFAULT 1,
        "rl_max"         int NOT NULL,
        "rl_window_ms"   int NOT NULL,
        "monthly_quota"  bigint,
        "monthly_used"   bigint NOT NULL DEFAULT 0,
        "last_reset_at"  timestamptz,
        "cooldown_until" timestamptz,
        "failure_count"  int NOT NULL DEFAULT 0,
        "last_error"     text,
        "last_used_at"   timestamptz,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_api_keys_provider_status" ON "api_keys" ("provider", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_api_keys_cooldown" ON "api_keys" ("provider", "status", "cooldown_until")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_cooldown"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_api_keys_provider_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "api_key_status"`);
  }
}
