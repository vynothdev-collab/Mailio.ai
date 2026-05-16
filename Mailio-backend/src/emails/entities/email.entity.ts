import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VerificationResult } from '../../common/types/verification-result.enum';
import { EmailList } from '../../email-lists/entities/email-list.entity';
import { User } from '../../users/entities/user.entity';

export enum EmailStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('emails')
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => EmailList, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'list_id' })
  list: EmailList | null;

  @Column({ name: 'list_id', nullable: true, type: 'uuid' })
  listId: string | null;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.QUEUED })
  status: EmailStatus;

  @Column({
    name: 'verification_result',
    type: 'enum',
    enum: VerificationResult,
    nullable: true,
  })
  verificationResult: VerificationResult | null;

  @Column({ name: 'is_single_verify', type: 'boolean', default: false })
  isSingleVerify: boolean;

  @Column({ type: 'smallint', nullable: true })
  score: number | null;

  @Column({ name: 'mx_found', type: 'boolean', nullable: true })
  mxFound: boolean | null;

  @Column({ name: 'smtp_check', type: 'boolean', nullable: true })
  smtpCheck: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  disposable: boolean | null;

  @Column({ name: 'catch_all', type: 'boolean', nullable: true })
  catchAll: boolean | null;

  @Column({ name: 'free_provider', type: 'boolean', nullable: true })
  freeProvider: boolean | null;

  @Column({ name: 'api_raw_response', type: 'jsonb', nullable: true })
  apiRawResponse: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'bull_job_id', type: 'varchar', length: 255, nullable: true })
  bullJobId: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'queued_at', type: 'timestamptz' })
  queuedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
