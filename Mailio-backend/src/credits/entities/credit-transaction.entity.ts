import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CreditAccountType {
  USER = 'USER',
  ENTERPRISE = 'ENTERPRISE',
}

export enum CreditTransactionType {
  ALLOCATION = 'ALLOCATION',
  RESERVATION = 'RESERVATION',
  DEDUCTION = 'DEDUCTION',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum CreditTransactionReason {
  ADMIN_ALLOCATION = 'ADMIN_ALLOCATION',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  SINGLE_VERIFY = 'SINGLE_VERIFY',
  BULK_VERIFY_RESERVE = 'BULK_VERIFY_RESERVE',
  BULK_VERIFY_REFUND = 'BULK_VERIFY_REFUND',
  PAYMENT = 'PAYMENT',
}

@Entity('credit_transactions')
@Index('idx_credit_tx_account', ['accountType', 'accountId', 'createdAt'])
@Index('idx_credit_tx_user', ['userId'])
@Index('idx_credit_tx_enterprise', ['enterpriseId'])
@Index('idx_credit_tx_reference', ['referenceType', 'referenceId'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_type', type: 'enum', enum: CreditAccountType })
  accountType!: CreditAccountType;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'enterprise_id', type: 'uuid', nullable: true })
  enterpriseId!: string | null;

  @Column({ type: 'enum', enum: CreditTransactionType })
  type!: CreditTransactionType;

  @Column({ type: 'enum', enum: CreditTransactionReason })
  reason!: CreditTransactionReason;

  // Positive = credit added; Negative = credit removed/reserved.
  @Column({ type: 'bigint' })
  delta!: string;

  @Column({ name: 'balance_after', type: 'bigint' })
  balanceAfter!: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
