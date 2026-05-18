import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDlqJobsTable1736000000003 implements MigrationInterface {
  name = 'CreateDlqJobsTable1736000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "dlq_status" AS ENUM ('PENDING', 'RETRIED', 'DISCARDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dlq_jobs" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "source_queue"   varchar(64) NOT NULL,
        "job_name"       varchar(64) NOT NULL,
        "user_id"        uuid,
        "payload"        jsonb NOT NULL,
        "error_message"  text NOT NULL,
        "attempts"       int NOT NULL,
        "status"         "dlq_status" NOT NULL DEFAULT 'PENDING',
        "retried_at"     timestamptz,
        "retried_to_job" varchar(128),
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dlq_status_created" ON "dlq_jobs" ("status", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dlq_source_queue" ON "dlq_jobs" ("source_queue", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dlq_user" ON "dlq_jobs" ("user_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dlq_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dlq_source_queue"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dlq_status_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dlq_jobs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dlq_status"`);
  }
}
