import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordReset1736000000008 implements MigrationInterface {
  name = 'AddPasswordReset1736000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "otp_purpose" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
  }
}
