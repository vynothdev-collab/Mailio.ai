import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanCategory } from '../../billing-plans/entities/billing-plan.entity';

export enum SubscriptionAccountType {
  USER = 'USER',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  QUEUED = 'QUEUED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('subscriptions')
@Index('idx_subs_user_active', ['userId', 'status'])
@Index('idx_subs_enterprise_active', ['enterpriseId', 'status'])
@Index('idx_subs_end_date', ['endDate'])
@Index('idx_subs_parent', ['parentSubscriptionId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_type', type: 'enum', enum: SubscriptionAccountType })
  accountType!: SubscriptionAccountType;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'enterprise_id', type: 'uuid', nullable: true })
  enterpriseId!: string | null;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'plan_category', type: 'enum', enum: PlanCategory })
  planCategory!: PlanCategory;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'total_credits', type: 'bigint' })
  totalCredits!: string;

  @Column({ name: 'used_credits', type: 'bigint', default: 0 })
  usedCredits!: string;

  @Column({ name: 'remaining_credits', type: 'bigint' })
  remainingCredits!: string;

  @Column({ name: 'parent_subscription_id', type: 'uuid', nullable: true })
  parentSubscriptionId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
