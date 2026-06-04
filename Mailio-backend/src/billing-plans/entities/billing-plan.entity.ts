import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Audience that a plan is offered to. `BOTH` lets a single plan be shown to
 * normal users and enterprise admins simultaneously.
 *
 * NOTE: the underlying DB column is still `plan_type` for backward compat.
 */
export enum BillingPlanType {
  USER = 'USER',
  ENTERPRISE = 'ENTERPRISE',
  BOTH = 'BOTH',
}

export enum PlanCategory {
  VALIDITY_BASED = 'VALIDITY_BASED',
  TOPUP = 'TOPUP',
}

@Entity('billing_plans')
export class BillingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Audience: USER | ENTERPRISE | BOTH. Column stays `plan_type` for compat. */
  @Column({ name: 'plan_type', type: 'enum', enum: BillingPlanType })
  planType: BillingPlanType;

  @Column({
    name: 'plan_category',
    type: 'enum',
    enum: PlanCategory,
    default: PlanCategory.VALIDITY_BASED,
  })
  planCategory: PlanCategory = PlanCategory.VALIDITY_BASED;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'int' })
  credits: number;

  /** Required for VALIDITY_BASED. NULL for TOPUP (inherits parent expiry). */
  @Column({ name: 'validity_days', type: 'int', nullable: true })
  validityDays: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  features: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
