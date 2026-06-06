import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AttachmentFileType = 'image' | 'video';

export type AttachmentUploaderType =
  | 'user'
  | 'enterprise_user'
  | 'enterprise_admin'
  | 'admin'
  | 'super_admin';

@Entity('support_ticket_attachments')
@Index('idx_ticket_attachments_ticket', ['ticketId'])
export class TicketAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  @Column({ name: 'uploaded_by_id', type: 'uuid', nullable: true })
  uploadedById!: string | null;

  @Column({ name: 'uploaded_by_type', type: 'varchar', length: 32 })
  uploadedByType!: AttachmentUploaderType;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 16 })
  fileType!: AttachmentFileType;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: string;

  @Column({ name: 's3_key', type: 'text' })
  s3Key!: string;

  @Column({ name: 's3_url', type: 'text', nullable: true })
  s3Url!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
