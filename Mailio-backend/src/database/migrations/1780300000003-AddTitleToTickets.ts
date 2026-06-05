import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add a short "title" column to tickets, separate from the longer "subject".
 * Existing rows are backfilled with the subject value so the column can be NOT NULL.
 */
export class AddTitleToTickets1780300000003 implements MigrationInterface {
  name = 'AddTitleToTickets1780300000003';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS title VARCHAR(120)
    `);
    await qr.query(`
      UPDATE tickets
         SET title = LEFT(subject, 120)
       WHERE title IS NULL
    `);
    await qr.query(`
      ALTER TABLE tickets
        ALTER COLUMN title SET NOT NULL
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS title
    `);
  }
}
