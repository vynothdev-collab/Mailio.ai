import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileImageToUsers1780300000004 implements MigrationInterface {
  name = 'AddProfileImageToUsers1780300000004';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT NULL,
        ADD COLUMN IF NOT EXISTS profile_image_key TEXT NULL
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS profile_image_key,
        DROP COLUMN IF EXISTS profile_image_url
    `);
  }
}
