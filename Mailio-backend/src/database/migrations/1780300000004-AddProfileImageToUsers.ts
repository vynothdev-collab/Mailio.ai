import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add S3-backed profile image fields to users.
 *
 *   profile_image_url  — cached public URL (or last-known URL).
 *   profile_image_key  — S3 object key. Required for deletion / re-uploads.
 *
 * Both nullable: existing users keep their initials avatar until they upload.
 */
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
