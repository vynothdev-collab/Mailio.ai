import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum LogType {
  SINGLE_USER = 'SINGLE_USER',
  SYSTEM = 'SYSTEM',
}

@Entity('admin_activity_logs')
@Index('idx_aal_type_created', ['type', 'createdAt'])
@Index('idx_aal_admin', ['changedByAdminId'])
export class AdminActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LogType, default: LogType.SINGLE_USER })
  type: LogType;

  @Column({ type: 'varchar', length: 100 })
  module: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string | null;

  @Column({ name: 'target_name', type: 'varchar', length: 255, nullable: true })
  targetName: string | null;

  @Column({ name: 'changed_by_admin_id', type: 'uuid' })
  changedByAdminId: string;

  @Column({ name: 'changed_by_admin_name', type: 'varchar', length: 255 })
  changedByAdminName: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
