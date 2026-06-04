import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TicketMessageSenderRole {
  USER = 'USER',
  ENTERPRISE_USER = 'ENTERPRISE_USER',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

@Entity('ticket_messages')
@Index('idx_tkt_msg_ticket', ['ticketId', 'createdAt'])
@Index('idx_tkt_msg_sender', ['senderId'])
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  /** Either a users.id or admins.id depending on senderRole. */
  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  @Column({ name: 'sender_role', type: 'enum', enum: TicketMessageSenderRole })
  senderRole!: TicketMessageSenderRole;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
