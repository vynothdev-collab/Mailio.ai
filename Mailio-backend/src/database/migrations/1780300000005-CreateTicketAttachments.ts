import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-ticket attachment metadata. Binary lives in S3 — this row only points
 * to the object via s3_key. Deletion is soft so we can audit / restore from
 * S3 lifecycle policies if needed.
 */
export class CreateTicketAttachments1780300000005 implements MigrationInterface {
  name = 'CreateTicketAttachments1780300000005';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_attachments (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id          UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        uploaded_by_id     UUID NULL,
        uploaded_by_type   VARCHAR(32) NOT NULL,
        file_name          VARCHAR(255) NOT NULL,
        original_name      VARCHAR(255) NOT NULL,
        mime_type          VARCHAR(128) NOT NULL,
        file_type          VARCHAR(16)  NOT NULL,
        size_bytes         BIGINT       NOT NULL,
        s3_key             TEXT         NOT NULL,
        s3_url             TEXT         NULL,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        deleted_at         TIMESTAMPTZ  NULL
      );
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket
        ON support_ticket_attachments (ticket_id)
        WHERE deleted_at IS NULL;
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploader
        ON support_ticket_attachments (uploaded_by_id)
        WHERE deleted_at IS NULL;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS support_ticket_attachments`);
  }
}
