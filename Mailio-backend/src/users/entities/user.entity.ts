import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Plan {
  PRO = 'PRO',
  ULTIMATE = 'ULTIMATE',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  LINKEDIN = 'LINKEDIN',
}

export enum UserRole {
  USER = 'USER',
  ENTERPRISE_USER = 'ENTERPRISE_USER',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const ENTERPRISE_ROLES: ReadonlyArray<UserRole> = [
  UserRole.ENTERPRISE_USER,
  UserRole.ENTERPRISE_ADMIN,
];

@Entity('users')
@Index('uq_users_provider_provider_id', ['provider', 'providerId'], {
  unique: true,
  where: '"provider_id" IS NOT NULL',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: Plan, default: Plan.PRO })
  plan: Plan;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ name: 'enterprise_id', type: 'uuid', nullable: true })
  enterpriseId!: string | null;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  // Per-user credit balance. Used only for role=USER. Enterprise members
  // consume from Enterprise.creditBalance instead.
  @Column({ name: 'credit_balance', type: 'bigint', default: 0 })
  creditBalance!: string;

  @Column({ name: 'credits_used', type: 'bigint', default: 0 })
  creditsUsed!: string;

  @Column({ name: 'current_plan_id', type: 'uuid', nullable: true })
  currentPlanId!: string | null;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
