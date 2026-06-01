import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntegrationApiKeysTable1779900000001
  implements MigrationInterface
{
  name = 'CreateIntegrationApiKeysTable1779900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_api_keys" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"       varchar(255) NOT NULL,
        "key_value"  varchar(255) NOT NULL UNIQUE,
        "is_active"  boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_integration_api_keys_active" ON "integration_api_keys" ("key_value", "is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_integration_api_keys_active"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_api_keys"`);
  }
}
