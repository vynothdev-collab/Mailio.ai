import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketMessageSenderRole } from './ticket-message.entity';

export enum TicketType {
  PAYMENT = 'PAYMENT',
  CREDITS = 'CREDITS',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  ACCOUNT = 'ACCOUNT',
  BILLING = 'BILLING',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  ENTERPRISE_SUPPORT = 'ENTERPRISE_SUPPORT',
  GENERAL = 'GENERAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  WAITING_FOR_ADMIN = 'WAITING_FOR_ADMIN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketCreatorRole {
  USER = 'USER',
  ENTERPRISE_USER = 'ENTERPRISE_USER',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN',
}

@Entity('tickets')
@Index('idx_tickets_status', ['status'])
@Index('idx_tickets_priority', ['priority'])
@Index('idx_tickets_type', ['type'])
@Index('idx_tickets_creator', ['createdByUserId'])
@Index('idx_tickets_enterprise', ['enterpriseId'])
@Index('idx_tickets_created_at', ['createdAt'])
@Index('idx_tickets_last_message', ['lastMessageAt'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Human-readable identifier, e.g. TCK-000123. Backed by ticket_number_seq. */
  @Column({ name: 'ticket_number', type: 'varchar', length: 32, unique: true })
  ticketNumber!: string;

  @Column({ type: 'varchar', length: 150 })
  subject!: string;

  @Column({ type: 'enum', enum: TicketType })
  type!: TicketType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;

  // ── Creator (FK + snapshot) ────────────────────────────────────────────
  // FK is nullable because users may be deleted; snapshot fields below
  // preserve creator identity for admins regardless of FK state.
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @Column({ name: 'user_role', type: 'enum', enum: TicketCreatorRole })
  userRole!: TicketCreatorRole;

  @Column({ name: 'enterprise_id', type: 'uuid', nullable: true })
  enterpriseId!: string | null;

  /** Snapshot of the creator's display name at ticket creation. */
  @Column({ name: 'created_by_name', type: 'varchar', length: 255 })
  createdByName!: string;

  @Column({ name: 'created_by_email', type: 'varchar', length: 255 })
  createdByEmail!: string;

  @Column({ name: 'created_by_role', type: 'enum', enum: TicketCreatorRole })
  createdByRole!: TicketCreatorRole;

  @Column({
    name: 'created_by_enterprise_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  createdByEnterpriseName!: string | null;

  // ── Assignment ─────────────────────────────────────────────────────────
  @Column({ name: 'assigned_admin_id', type: 'uuid', nullable: true })
  assignedAdminId!: string | null;

  // ── Activity tracking ──────────────────────────────────────────────────
  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @Column({
    name: 'last_message_by_role',
    type: 'enum',
    enum: TicketMessageSenderRole,
    nullable: true,
  })
  lastMessageByRole!: TicketMessageSenderRole | null;

  @Column({ name: 'admin_unread_count', type: 'int', default: 0 })
  adminUnreadCount!: number;

  @Column({ name: 'user_unread_count', type: 'int', default: 0 })
  userUnreadCount!: number;

  @Column({ name: 'last_reply_at', type: 'timestamptz', nullable: true })
  lastReplyAt!: Date | null;

  /** Set the first time any admin opens the ticket detail. Used for "New" badge. */
  @Column({
    name: 'first_admin_opened_at',
    type: 'timestamptz',
    nullable: true,
  })
  firstAdminOpenedAt!: Date | null;

  /** Updated every time an admin opens the ticket detail. */
  @Column({ name: 'last_admin_viewed_at', type: 'timestamptz', nullable: true })
  lastAdminViewedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
