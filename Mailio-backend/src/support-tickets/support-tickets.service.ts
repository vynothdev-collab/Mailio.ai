import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import {
  Ticket,
  TicketCreatorRole,
  TicketPriority,
  TicketStatus,
  TicketType,
} from './entities/ticket.entity';
import {
  TicketMessage,
  TicketMessageSenderRole,
} from './entities/ticket-message.entity';

/** Map ticket type → default priority. Super-admin may override later. */
const PRIORITY_BY_TYPE: Record<TicketType, TicketPriority> = {
  [TicketType.PAYMENT]: TicketPriority.HIGH,
  [TicketType.CREDITS]: TicketPriority.HIGH,
  [TicketType.BILLING]: TicketPriority.HIGH,
  [TicketType.TECHNICAL_ISSUE]: TicketPriority.MEDIUM,
  [TicketType.ENTERPRISE_SUPPORT]: TicketPriority.MEDIUM,
  [TicketType.ACCOUNT]: TicketPriority.MEDIUM,
  [TicketType.FEATURE_REQUEST]: TicketPriority.LOW,
  [TicketType.GENERAL]: TicketPriority.LOW,
};

const CREATOR_ROLE_BY_USER: Record<UserRole, TicketCreatorRole | null> = {
  [UserRole.USER]: TicketCreatorRole.USER,
  [UserRole.ENTERPRISE_USER]: TicketCreatorRole.ENTERPRISE_USER,
  [UserRole.ENTERPRISE_ADMIN]: TicketCreatorRole.ENTERPRISE_ADMIN,
  [UserRole.SUPER_ADMIN]: null, // super admins use the admin reply path, not "create ticket"
};

/**
 * Core support-tickets logic used by both the user-facing controller and the
 * super-admin controller. Permissions are enforced here so we can't accidentally
 * leak data via a wrong route.
 */
@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly msgRepo: Repository<TicketMessage>,
  ) {}

  // ─── Creation ───────────────────────────────────────────────────────────────

  async createTicket(user: User, dto: CreateTicketDto): Promise<Ticket> {
    const creatorRole = CREATOR_ROLE_BY_USER[user.role];
    if (!creatorRole) {
      throw new ForbiddenException(
        'Super admins cannot raise support tickets.',
      );
    }

    // Snapshot enterprise name once so it survives enterprise deletion.
    const enterpriseName = user.enterpriseId
      ? await this.lookupEnterpriseName(user.enterpriseId)
      : null;

    const senderRole = this.senderRoleForUser(user);

    return this.dataSource.transaction(async (em) => {
      const number = await this.nextTicketNumber(em);
      const now = new Date();
      const ticket = em.create(Ticket, {
        ticketNumber: number,
        title: dto.title.trim(),
        subject: dto.subject.trim(),
        type: dto.type,
        content: dto.content,
        status: TicketStatus.OPEN,
        priority: PRIORITY_BY_TYPE[dto.type] ?? TicketPriority.MEDIUM,
        createdByUserId: user.id,
        userRole: creatorRole,
        enterpriseId: user.enterpriseId ?? null,

        // Snapshot — never updated. Survives user/enterprise deletion.
        createdByName: user.name,
        createdByEmail: user.email,
        createdByRole: creatorRole,
        createdByEnterpriseName: enterpriseName,

        assignedAdminId: null,

        // First activity = ticket creation message.
        lastMessageAt: now,
        lastMessageByRole: senderRole,
        adminUnreadCount: 1,
        userUnreadCount: 0,

        lastReplyAt: null,
        resolvedAt: null,
        closedAt: null,
      });
      const saved = await em.save(ticket);

      // First thread message mirrors the ticket content for conversation history.
      // UI deduplicates it (shows `content` as "Original Issue" and slices from msg[1:]).
      await em.save(
        em.create(TicketMessage, {
          ticketId: saved.id,
          senderId: user.id,
          senderRole,
          message: dto.content,
        }),
      );
      this.logger.log(
        `Ticket ${saved.ticketNumber} created by ${user.role}=${user.id} type=${dto.type} priority=${saved.priority}`,
      );
      return saved;
    });
  }

  // ─── User-side queries ──────────────────────────────────────────────────────

  /**
   * Paginated list of the caller's own tickets with optional filters.
   * Server-side pagination + filtering — the user UI doesn't have to load
   * everything at once.
   */
  async listMyTickets(user: User, filters: MyTicketFilters = {}) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.created_by_user_id = :uid', { uid: user.id })
      .andWhere('t.deleted_at IS NULL');

    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }
    if (filters.search) {
      qb.andWhere(`(t.ticket_number ILIKE :q OR t.title ILIKE :q OR t.subject ILIKE :q)`, {
        q: `%${filters.search}%`,
      });
    }

    qb.orderBy('t.created_at', 'DESC');

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Return one ticket + its message thread, enforcing the access rules:
   *   - Creator can read their own ticket.
   *   - Enterprise admin can read tickets raised inside their enterprise.
   *   - Super admins go through the admin controller (which calls
   *     `getTicketForAdmin` below) and skip this check entirely.
   */
  async getTicketForUser(user: User, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    const isOwner = ticket.createdByUserId === user.id;
    const isEntAdmin =
      user.role === UserRole.ENTERPRISE_ADMIN &&
      !!user.enterpriseId &&
      ticket.enterpriseId === user.enterpriseId;
    if (!isOwner && !isEntAdmin) {
      throw new ForbiddenException('You do not have access to this ticket.');
    }

    // Owner opening the ticket → clear their unread badge.
    // Enterprise admins viewing someone else's ticket should NOT clear that
    // owner's unread, so we only reset when the viewer is the owner.
    if (isOwner && ticket.userUnreadCount > 0) {
      ticket.userUnreadCount = 0;
      try {
        await this.ticketRepo.update(ticket.id, { userUnreadCount: 0 });
      } catch (err) {
        this.logger.warn(
          `getTicketForUser: failed to reset userUnreadCount for ${ticket.id}: ${(err as Error).message}`,
        );
      }
    }

    const messages = await this.msgRepo.find({
      where: { ticketId: ticket.id, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return { ticket, messages };
  }

  async replyAsUser(user: User, ticketId: string, dto: ReplyTicketDto) {
    const { ticket } = await this.getTicketForUser(user, ticketId);
    if (
      ticket.status === TicketStatus.CLOSED ||
      ticket.status === TicketStatus.RESOLVED
    ) {
      throw new BadRequestException(
        'This ticket is closed. Please open a new one.',
      );
    }

    const senderRole = this.senderRoleForUser(user);
    return this.dataSource.transaction(async (em) => {
      const msg = await em.save(
        em.create(TicketMessage, {
          ticketId: ticket.id,
          senderId: user.id,
          senderRole,
          message: dto.message,
        }),
      );
      const now = new Date();
      // User replied → admin has one more unread; user has 0 unread now.
      await em.query(
        `UPDATE tickets
            SET status               = $1,
                last_reply_at        = $2,
                last_message_at      = $2,
                last_message_by_role = $3,
                admin_unread_count   = admin_unread_count + 1,
                user_unread_count    = 0,
                updated_at           = now()
          WHERE id = $4`,
        [TicketStatus.WAITING_FOR_ADMIN, now, senderRole, ticket.id],
      );
      return msg;
    });
  }

  // ─── Admin-side queries ─────────────────────────────────────────────────────

  async listForAdmin(filters: AdminTicketFilters) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id = t.created_by_user_id')
      .leftJoin('enterprises', 'e', 'e.id = t.enterprise_id')
      .select([
        't.id                          AS id',
        't.ticket_number               AS "ticketNumber"',
        't.title                       AS title',
        't.subject                     AS subject',
        't.type                        AS type',
        't.status                      AS status',
        't.priority                    AS priority',
        't.user_role                   AS "userRole"',
        't.enterprise_id               AS "enterpriseId"',
        't.last_reply_at               AS "lastReplyAt"',
        't.last_message_at             AS "lastMessageAt"',
        't.last_message_by_role        AS "lastMessageByRole"',
        't.admin_unread_count          AS "adminUnreadCount"',
        't.user_unread_count           AS "userUnreadCount"',
        't.first_admin_opened_at       AS "firstAdminOpenedAt"',
        't.last_admin_viewed_at        AS "lastAdminViewedAt"',
        't.created_at                  AS "createdAt"',
        't.updated_at                  AS "updatedAt"',
        // Prefer live user fields; fall back to snapshot so deleted users still
        // appear correctly in the admin list.
        'u.id                                       AS "user.id"',
        'COALESCE(u.name,  t.created_by_name)       AS "user.name"',
        'COALESCE(u.email, t.created_by_email)      AS "user.email"',
        'u.plan                                     AS "user.plan"',
        'COALESCE(e.name, t.created_by_enterprise_name) AS "enterprise.name"',
      ])
      .where('t.deleted_at IS NULL');

    this.applyAdminFilters(qb, filters);

    // ── Sort ──────────────────────────────────────────────────────────────
    // Default sort: ticket creation time, newest first. The admin can switch
    // to priority / unread-first via the Sort menu.
    switch (filters.sortBy) {
      case 'oldest':
        qb.orderBy('t.created_at', 'ASC');
        break;
      case 'latest':
        qb.orderBy('COALESCE(t.last_message_at, t.updated_at)', 'DESC');
        break;
      case 'priority':
        qb.orderBy(
          `CASE t.priority
             WHEN 'URGENT' THEN 0
             WHEN 'HIGH'   THEN 1
             WHEN 'MEDIUM' THEN 2
             WHEN 'LOW'    THEN 3
           END`,
          'ASC',
        ).addOrderBy('t.created_at', 'DESC');
        break;
      case 'unread':
        qb.orderBy('(t.admin_unread_count > 0)', 'DESC').addOrderBy(
          't.last_message_at',
          'DESC',
        );
        break;
      case 'new':
        qb.orderBy(
          `(t.first_admin_opened_at IS NULL AND t.status = 'OPEN')`,
          'DESC',
        ).addOrderBy('t.created_at', 'DESC');
        break;
      default: // smart → newest first
        qb.orderBy('t.created_at', 'DESC');
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    qb.offset((page - 1) * limit).limit(limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<AdminTicketRow>(),
      this.adminCount(filters),
    ]);

    return {
      data: rows.map(this.shapeAdminRow),
      page,
      limit,
      total,
    };
  }

  /**
   * Shared WHERE-clause builder used by both listForAdmin and adminCount so
   * the count always matches the page query.
   */
  private applyAdminFilters(
    qb: ReturnType<Repository<Ticket>['createQueryBuilder']>,
    filters: AdminTicketFilters,
  ): void {
    if (filters.status)
      qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.priority)
      qb.andWhere('t.priority = :priority', { priority: filters.priority });
    if (filters.type) qb.andWhere('t.type = :type', { type: filters.type });
    if (filters.userRole)
      qb.andWhere('t.user_role = :urole', { urole: filters.userRole });
    if (filters.enterpriseId)
      qb.andWhere('t.enterprise_id = :eid', { eid: filters.enterpriseId });
    if (filters.enterpriseOnly) qb.andWhere('t.enterprise_id IS NOT NULL');
    if (filters.unreadOnly) qb.andWhere('t.admin_unread_count > 0');
    if (filters.from)
      qb.andWhere('t.created_at >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('t.created_at <= :to', { to: filters.to });
    if (filters.search) {
      qb.andWhere(
        `(t.ticket_number ILIKE :q OR t.title ILIKE :q OR t.subject ILIKE :q OR u.name ILIKE :q OR u.email ILIKE :q OR t.created_by_name ILIKE :q OR t.created_by_email ILIKE :q)`,
        { q: `%${filters.search}%` },
      );
    }
  }

  async adminStats() {
    const rows = await this.ticketRepo
      .createQueryBuilder('t')
      .select([
        `COUNT(*) FILTER (WHERE t.status = 'OPEN')                                   AS open`,
        `COUNT(*) FILTER (WHERE t.status = 'WAITING_FOR_ADMIN')                      AS needs_reply`,
        `COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')                            AS in_progress`,
        `COUNT(*) FILTER (WHERE t.status = 'WAITING_FOR_USER')                       AS waiting_user`,
        `COUNT(*) FILTER (WHERE t.status = 'RESOLVED')                               AS resolved`,
        `COUNT(*) FILTER (WHERE t.status = 'CLOSED')                                 AS closed`,
        `COUNT(*) FILTER (WHERE t.priority IN ('HIGH','URGENT') AND t.status NOT IN ('RESOLVED','CLOSED')) AS urgent_high`,
        `COUNT(*) FILTER (WHERE t.admin_unread_count > 0)                            AS unread`,
      ])
      .where('t.deleted_at IS NULL')
      .getRawOne<{
        open: string;
        needs_reply: string;
        in_progress: string;
        waiting_user: string;
        resolved: string;
        closed: string;
        urgent_high: string;
        unread: string;
      }>();
    return {
      open: +(rows?.open ?? 0),
      needsReply: +(rows?.needs_reply ?? 0),
      inProgress: +(rows?.in_progress ?? 0),
      waitingForUser: +(rows?.waiting_user ?? 0),
      // Kept for compat with existing admin UI that referenced waitingForAdmin.
      waitingForAdmin: +(rows?.needs_reply ?? 0),
      resolved: +(rows?.resolved ?? 0),
      closed: +(rows?.closed ?? 0),
      urgentHigh: +(rows?.urgent_high ?? 0),
      unread: +(rows?.unread ?? 0),
    };
  }

  async getTicketForAdmin(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    // Mark as opened/viewed by admin. Resets the admin unread badge.
    // Best-effort: errors don't block the read path.
    const now = new Date();
    if (!ticket.firstAdminOpenedAt) {
      ticket.firstAdminOpenedAt = now;
    }
    ticket.lastAdminViewedAt = now;
    ticket.adminUnreadCount = 0;
    try {
      await this.ticketRepo.update(ticket.id, {
        firstAdminOpenedAt: ticket.firstAdminOpenedAt,
        lastAdminViewedAt: now,
        adminUnreadCount: 0,
      });
    } catch (err) {
      this.logger.warn(
        `getTicketForAdmin: failed to mark ticket ${ticket.id} as viewed: ${(err as Error).message}`,
      );
    }

    // Pull creator + enterprise + messages in parallel.
    // Creator lookup may return [] if the user has been deleted — in that
    // case we synthesize a creator object from the snapshot columns so the
    // admin still sees who originally raised the ticket.
    const [creator, enterprise, messages] = await Promise.all([
      ticket.createdByUserId
        ? this.dataSource.query<UserSlim[]>(
            `SELECT id, name, email, plan, role, enterprise_id AS "enterpriseId", created_at AS "createdAt"
               FROM users WHERE id = $1`,
            [ticket.createdByUserId],
          )
        : Promise.resolve([] as UserSlim[]),
      ticket.enterpriseId
        ? this.dataSource.query<EnterpriseSlim[]>(
            `SELECT id, name, credit_balance AS "creditBalance" FROM enterprises WHERE id = $1`,
            [ticket.enterpriseId],
          )
        : Promise.resolve([] as EnterpriseSlim[]),
      this.msgRepo.find({
        where: { ticketId: ticket.id, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const creatorOut: UserSlim | null = creator[0] ?? {
      id: ticket.createdByUserId ?? '',
      name: ticket.createdByName,
      email: ticket.createdByEmail,
      plan: '',
      role: ticket.createdByRole as unknown as UserRole,
      enterpriseId: ticket.enterpriseId,
      createdAt: ticket.createdAt,
      deleted: true,
    };

    const enterpriseOut: EnterpriseSlim | null =
      enterprise[0] ??
      (ticket.createdByEnterpriseName
        ? {
            id: ticket.enterpriseId ?? '',
            name: ticket.createdByEnterpriseName,
            creditBalance: '0',
          }
        : null);

    // Hydrate sender names for the thread.
    const senderIds = Array.from(new Set(messages.map((m) => m.senderId)));
    const [userSenders, adminSenders] = await Promise.all([
      senderIds.length
        ? this.dataSource.query<SenderSlim[]>(
            `SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])`,
            [senderIds],
          )
        : Promise.resolve([] as SenderSlim[]),
      senderIds.length
        ? this.dataSource.query<SenderSlim[]>(
            `SELECT id, name, email FROM admins WHERE id = ANY($1::uuid[])`,
            [senderIds],
          )
        : Promise.resolve([] as SenderSlim[]),
    ]);
    const senderMap = new Map<string, SenderSlim>();
    [...userSenders, ...adminSenders].forEach((s) => senderMap.set(s.id, s));

    return {
      ticket,
      creator: creatorOut,
      enterprise: enterpriseOut,
      messages: messages.map((m) => ({
        ...m,
        senderName: senderMap.get(m.senderId)?.name ?? 'Unknown',
        senderEmail: senderMap.get(m.senderId)?.email ?? null,
      })),
    };
  }

  async replyAsAdmin(
    adminId: string,
    isSuper: boolean,
    ticketId: string,
    dto: ReplyTicketDto,
  ) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    const senderRole = isSuper
      ? TicketMessageSenderRole.SUPER_ADMIN
      : TicketMessageSenderRole.ADMIN;

    return this.dataSource.transaction(async (em) => {
      const msg = await em.save(
        em.create(TicketMessage, {
          ticketId: ticket.id,
          senderId: adminId,
          senderRole,
          message: dto.message,
        }),
      );
      const now = new Date();
      // Admin replied → user has one more unread; admin queue clears for this ticket.
      // No auto-assignment — every admin can act on any ticket in this product.
      void adminId;
      await em.query(
        `UPDATE tickets
            SET status               = $1,
                last_reply_at        = $2,
                last_message_at      = $2,
                last_message_by_role = $3,
                admin_unread_count   = 0,
                user_unread_count    = user_unread_count + 1,
                updated_at           = now()
          WHERE id = $4`,
        [TicketStatus.WAITING_FOR_USER, now, senderRole, ticket.id],
      );
      return msg;
    });
  }

  async updateStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const patch: Partial<Ticket> = { status };
    if (status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      patch.resolvedAt = new Date();
    }
    if (status === TicketStatus.CLOSED && !ticket.closedAt) {
      patch.closedAt = new Date();
    }
    // Reopen path: moving from CLOSED → OPEN/IN_PROGRESS clears closedAt
    // (and resolvedAt, since the ticket is no longer resolved).
    const reopening =
      ticket.status === TicketStatus.CLOSED &&
      (status === TicketStatus.OPEN || status === TicketStatus.IN_PROGRESS);
    if (reopening) {
      patch.closedAt = null;
      patch.resolvedAt = null;
    }
    await this.ticketRepo.update(ticket.id, patch);
    return this.ticketRepo.findOne({ where: { id: ticket.id } });
  }

  async updatePriority(ticketId: string, priority: TicketPriority) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    await this.ticketRepo.update(ticket.id, { priority });
    return this.ticketRepo.findOne({ where: { id: ticket.id } });
  }

  async assign(ticketId: string, assignedAdminId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    // Validate that the target id is an active admin — never let a ticket be
    // assigned to a random user id.
    const adminRows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM admins WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
      [assignedAdminId],
    );
    if (adminRows.length === 0) {
      throw new BadRequestException(
        'Invalid assignee — must be an active admin id.',
      );
    }

    await this.ticketRepo.update(ticket.id, { assignedAdminId });
    return this.ticketRepo.findOne({ where: { id: ticket.id } });
  }

  async softDelete(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, deletedAt: IsNull() },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    await this.ticketRepo.softRemove(ticket);
    return { success: true };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async lookupEnterpriseName(
    enterpriseId: string,
  ): Promise<string | null> {
    const rows = await this.dataSource.query<{ name: string }[]>(
      `SELECT name FROM enterprises WHERE id = $1`,
      [enterpriseId],
    );
    return rows[0]?.name ?? null;
  }

  private async nextTicketNumber(em: {
    query: (q: string) => Promise<{ next: string }[]>;
  }): Promise<string> {
    const rows = await em.query(
      `SELECT 'TCK-' || LPAD(nextval('ticket_number_seq')::text, 6, '0') AS next`,
    );
    return rows[0]?.next ?? `TCK-${Date.now()}`;
  }

  private senderRoleForUser(user: User): TicketMessageSenderRole {
    switch (user.role) {
      case UserRole.ENTERPRISE_USER:
        return TicketMessageSenderRole.ENTERPRISE_USER;
      case UserRole.ENTERPRISE_ADMIN:
        return TicketMessageSenderRole.ENTERPRISE_ADMIN;
      case UserRole.SUPER_ADMIN:
        return TicketMessageSenderRole.SUPER_ADMIN;
      default:
        return TicketMessageSenderRole.USER;
    }
  }

  private async adminCount(filters: AdminTicketFilters): Promise<number> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id = t.created_by_user_id')
      .where('t.deleted_at IS NULL');
    this.applyAdminFilters(qb, filters);
    return qb.getCount();
  }

  private shapeAdminRow = (r: AdminTicketRow) => {
    // Derived flags help the UI without forcing it to know status semantics.
    const isUnreadForAdmin = r.adminUnreadCount > 0;
    const isNewForAdmin =
      !r.firstAdminOpenedAt && r.status === TicketStatus.OPEN;
    const needsAdminReply =
      r.status === TicketStatus.WAITING_FOR_ADMIN || isNewForAdmin;
    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      title: r.title,
      subject: r.subject,
      type: r.type,
      status: r.status,
      priority: r.priority,
      userRole: r.userRole,
      enterpriseId: r.enterpriseId,
      lastReplyAt: r.lastReplyAt,
      lastMessageAt: r.lastMessageAt,
      lastMessageByRole: r.lastMessageByRole,
      adminUnreadCount: r.adminUnreadCount,
      userUnreadCount: r.userUnreadCount,
      firstAdminOpenedAt: r.firstAdminOpenedAt,
      lastAdminViewedAt: r.lastAdminViewedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      // Convenience flat fields used by the helpdesk list rows.
      requesterDisplayName: r['user.name'],
      requesterEmail: r['user.email'],
      requesterRole: r.userRole,
      enterpriseName: r['enterprise.name'],
      // Derived
      isUnreadForAdmin,
      isNewForAdmin,
      needsAdminReply,
      user: {
        id: r['user.id'],
        name: r['user.name'],
        email: r['user.email'],
        plan: r['user.plan'],
      },
      enterprise: r['enterprise.name'] ? { name: r['enterprise.name'] } : null,
    };
  };

  /** Reference used by enterprise admin lookups elsewhere (keeps the In import live). */
  protected readonly _refUsed = In;
}

export interface MyTicketFilters {
  status?: TicketStatus;
  type?: TicketType;
  search?: string;
  page?: number;
  limit?: number;
}

export type AdminTicketSort =
  | 'smart'
  | 'latest'
  | 'oldest'
  | 'priority'
  | 'unread'
  | 'new';

export interface AdminTicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  userRole?: TicketCreatorRole;
  enterpriseId?: string;
  enterpriseOnly?: boolean;
  unreadOnly?: boolean;
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
  sortBy?: AdminTicketSort;
}

interface AdminTicketRow {
  lastMessageAt: Date | null;
  lastMessageByRole: string | null;
  adminUnreadCount: number;
  userUnreadCount: number;
  firstAdminOpenedAt: Date | null;
  lastAdminViewedAt: Date | null;

  id: string;
  ticketNumber: string;
  title: string;
  subject: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  userRole: TicketCreatorRole;
  enterpriseId: string | null;
  lastReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  'user.id': string;
  'user.name': string;
  'user.email': string;
  'user.plan': string;
  'enterprise.name': string | null;
}

export interface UserSlim {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: UserRole;
  enterpriseId: string | null;
  createdAt: Date;
  /** True when this object is synthesized from the ticket snapshot
   * because the underlying user row was deleted. */
  deleted?: boolean;
}

export interface EnterpriseSlim {
  id: string;
  name: string;
  creditBalance: string;
}

interface SenderSlim {
  id: string;
  name: string;
  email: string;
}
