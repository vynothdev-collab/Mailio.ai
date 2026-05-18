import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkedinAuthProvider1736000000005 implements MigrationInterface {
  name = 'AddLinkedinAuthProvider1736000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "auth_provider" ADD VALUE 'LINKEDIN';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values. Reverting requires
    // recreating the type — left manual for safety.
  }
}
