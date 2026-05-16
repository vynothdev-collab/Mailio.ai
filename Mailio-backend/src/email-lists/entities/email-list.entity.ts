import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum EmailListStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum EmailListParseStatus {
  PENDING = 'PENDING',
  PARSING = 'PARSING',
  PARSED = 'PARSED',
  FAILED = 'FAILED',
}

@Entity('email_lists')
export class EmailList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: EmailListStatus,
    default: EmailListStatus.PENDING,
  })
  status: EmailListStatus;

  @Column({ name: 'total_count', type: 'int', default: 0 })
  totalCount: number;

  @Column({ name: 'processed_count', type: 'int', default: 0 })
  processedCount: number;

  @Column({ name: 'valid_count', type: 'int', default: 0 })
  validCount: number;

  @Column({ name: 'invalid_count', type: 'int', default: 0 })
  invalidCount: number;

  @Column({ name: 'risky_count', type: 'int', default: 0 })
  riskyCount: number;

  @Column({ name: 'unknown_count', type: 'int', default: 0 })
  unknownCount: number;

  @Column({ name: 'disposable_count', type: 'int', default: 0 })
  disposableCount: number;

  @Column({
    name: 'original_filename',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  originalFilename: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({
    name: 'parse_status',
    type: 'enum',
    enum: EmailListParseStatus,
    default: EmailListParseStatus.PARSED,
  })
  parseStatus: EmailListParseStatus;

  @Column({ name: 'parse_error', type: 'text', nullable: true })
  parseError: string | null;

  @Column({ name: 'quota_truncated', type: 'boolean', default: false })
  quotaTruncated: boolean;

  @Column({ name: 'duplicates', type: 'int', default: 0 })
  duplicates: number;

  @Column({
    name: 'detected_column',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  detectedColumn: string | null;

  // lazy relation — imported at runtime to avoid circular dep
  @OneToMany('Email', 'list')
  emails: any[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
