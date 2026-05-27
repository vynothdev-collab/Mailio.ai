import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordChangeOtpPurpose1779900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "email_otps_purpose_enum" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values
  }
}
