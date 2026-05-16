import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DlqStatus {
  PENDING = 'PENDING',
  RETRIED = 'RETRIED',
  DISCARDED = 'DISCARDED',
}

@Entity('dlq_jobs')
@Index('idx_dlq_status_created', ['status', 'createdAt'])
export class DlqJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_queue', type: 'varchar', length: 64 })
  sourceQueue: string;

  @Column({ name: 'job_name', type: 'varchar', length: 64 })
  jobName: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage: string;

  @Column({ type: 'int' })
  attempts: number;

  @Column({ type: 'enum', enum: DlqStatus, default: DlqStatus.PENDING })
  status: DlqStatus;

  @Column({ name: 'retried_at', type: 'timestamptz', nullable: true })
  retriedAt: Date | null;

  @Column({
    name: 'retried_to_job',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  retriedToJob: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
