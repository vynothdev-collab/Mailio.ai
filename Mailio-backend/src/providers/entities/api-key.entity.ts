import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  COOLDOWN = 'COOLDOWN',
  DISABLED = 'DISABLED',
}

@Entity('api_keys')
@Index('idx_api_keys_provider_status', ['provider', 'status'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ name: 'key_value', type: 'text' })
  keyValue: string;

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({ type: 'int', default: 1 })
  weight: number;

  @Column({ name: 'rl_max', type: 'int' })
  rlMax: number;

  @Column({ name: 'rl_window_ms', type: 'int' })
  rlWindowMs: number;

  @Column({ name: 'monthly_quota', type: 'bigint', nullable: true })
  monthlyQuota: string | null;

  @Column({ name: 'monthly_used', type: 'bigint', default: 0 })
  monthlyUsed: string;

  @Column({ name: 'last_reset_at', type: 'timestamptz', nullable: true })
  lastResetAt: Date | null;

  @Column({ name: 'cooldown_until', type: 'timestamptz', nullable: true })
  cooldownUntil: Date | null;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
