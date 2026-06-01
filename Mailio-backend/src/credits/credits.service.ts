import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { ENTERPRISE_ROLES, User } from '../users/entities/user.entity';
import {
  CreditAccountType,
  CreditTransaction,
  CreditTransactionReason,
  CreditTransactionType,
} from './entities/credit-transaction.entity';

export class InsufficientCreditsException extends HttpException {
  constructor(required: number, available: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Insufficient Credits',
        message: `Not enough credits. Required: ${required}, available: ${available}.`,
        required,
        available,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

interface CreditAccountSnapshot {
  type: CreditAccountType;
  id: string;
  userId: string | null;
  enterpriseId: string | null;
  balance: number;
}

interface MutationOptions {
  type: CreditTransactionType;
  reason: CreditTransactionReason;
  delta: number; // signed; negative = debit, positive = credit
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdByAdminId?: string | null;
  createdByUserId?: string | null;
}

/**
 * Central credit accounting. All balance mutations go through this service
 * inside a SERIALIZABLE row lock so concurrent verifications cannot oversell.
 *
 * Account resolution:
 *   - Enterprise members (ENTERPRISE_USER, ENTERPRISE_ADMIN) consume from
 *     the shared enterprise balance.
 *   - All other users (USER, SUPER_ADMIN) consume from their own balance.
 */
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
  ) {}

  /** Resolves the credit account the user draws from, without locking. */
  async getEffectiveAccount(user: User): Promise<CreditAccountSnapshot> {
    if (this.usesEnterpriseBalance(user)) {
      if (!user.enterpriseId) {
        throw new ForbiddenException(
          'Enterprise account is missing — contact your administrator.',
        );
      }
      const e = await this.dataSource
        .getRepository(Enterprise)
        .findOne({ where: { id: user.enterpriseId } });
      if (!e || !e.isActive || e.deletedAt) {
        throw new ForbiddenException('Enterprise is inactive or unavailable.');
      }
      return {
        type: CreditAccountType.ENTERPRISE,
        id: e.id,
        userId: null,
        enterpriseId: e.id,
        balance: Number(e.creditBalance),
      };
    }
    return {
      type: CreditAccountType.USER,
      id: user.id,
      userId: user.id,
      enterpriseId: null,
      balance: Number(user.creditBalance ?? 0),
    };
  }

  async ensureSufficient(user: User, required: number): Promise<void> {
    if (required <= 0) return;
    const account = await this.getEffectiveAccount(user);
    if (account.balance < required) {
      throw new InsufficientCreditsException(required, account.balance);
    }
  }

  // ---------- Verification credit flows ----------

  /**
   * Deduct exactly 1 credit for a synchronous single verification.
   * Throws InsufficientCreditsException if the caller has no credits left.
   */
  async deductForSingleVerify(
    user: User,
    referenceId: string,
  ): Promise<{ balanceAfter: number }> {
    return this.mutate(user, {
      type: CreditTransactionType.DEDUCTION,
      reason: CreditTransactionReason.SINGLE_VERIFY,
      delta: -1,
      referenceType: 'email',
      referenceId,
      description: 'Single email verification',
      createdByUserId: user.id,
    });
  }

  /**
   * Reserve N credits up-front for a bulk job. Reservation is just a debit
   * on the account balance with a RESERVATION transaction row — it is the
   * caller's responsibility to issue REFUND transactions for unused credits
   * once the job reaches a terminal state.
   */
  async reserveForBulk(
    user: User,
    listId: string,
    count: number,
  ): Promise<{ balanceAfter: number }> {
    if (count <= 0) {
      throw new BadRequestException('Reservation count must be positive.');
    }
    return this.mutate(user, {
      type: CreditTransactionType.RESERVATION,
      reason: CreditTransactionReason.BULK_VERIFY_RESERVE,
      delta: -count,
      referenceType: 'email_list',
      referenceId: listId,
      description: `Bulk verification — reserve ${count} credits`,
      createdByUserId: user.id,
    });
  }

  /**
   * Refund N credits back to the original account that funded a bulk job.
   * Use for emails that failed for system/provider reasons and should not
   * be charged. Refund is bounded by the actually reserved amount, which
   * the caller must track on the email_list row.
   */
  async refundBulk(
    accountType: CreditAccountType,
    accountId: string,
    listId: string,
    count: number,
    actor: { adminId?: string | null; userId?: string | null },
  ): Promise<{ balanceAfter: number }> {
    if (count <= 0) {
      throw new BadRequestException('Refund count must be positive.');
    }
    return this.mutateByAccount(accountType, accountId, {
      type: CreditTransactionType.REFUND,
      reason: CreditTransactionReason.BULK_VERIFY_REFUND,
      delta: count,
      referenceType: 'email_list',
      referenceId: listId,
      description: `Bulk verification — refund ${count} credits`,
      createdByAdminId: actor.adminId ?? null,
      createdByUserId: actor.userId ?? null,
    });
  }

  /**
   * Reserve N credits for a bulk job by looking up the list owner. Returns
   * `null` if the user does not exist (caller treats as a hard failure).
   * Also bumps `email_lists.credits_reserved` by N. Used by the retry path
   * where we only have a userId, not a full User entity.
   */
  async reserveForBulkByOwnerId(
    listId: string,
    ownerUserId: string,
    count: number,
  ): Promise<{ balanceAfter: number }> {
    const owner = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: ownerUserId } });
    if (!owner) {
      throw new BadRequestException(
        `Owner user ${ownerUserId} not found for list ${listId}.`,
      );
    }
    const result = await this.reserveForBulk(owner, listId, count);
    try {
      await this.dataSource.query(
        `UPDATE email_lists
           SET credits_reserved = credits_reserved + $1,
               updated_at = now()
         WHERE id = $2`,
        [String(count), listId],
      );
    } catch (e) {
      this.logger.warn(
        `Failed to bump credits_reserved for list ${listId} (count=${count}): ${(e as Error).message}`,
      );
    }
    this.logger.log(
      `Reserved ${count} additional credit(s) for list ${listId} (balanceAfter=${result.balanceAfter})`,
    );
    return result;
  }

  /**
   * Refund N credits to the account that funded the given bulk list, by
   * resolving the list owner's effective account. The caller MUST gate this
   * on an idempotency signal (e.g., `markFailed` returning `transitioned=true`)
   * — this method does not deduplicate by itself.
   *
   * Also bumps `email_lists.credits_refunded` for reconciliation. This counter
   * is denormalized; the ledger (`credit_transactions`) remains the source of
   * truth.
   */
  async refundBulkByListOwner(
    listId: string,
    ownerUserId: string,
    count: number,
  ): Promise<{ balanceAfter: number } | null> {
    if (count <= 0) {
      throw new BadRequestException('Refund count must be positive.');
    }

    const owner = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: ownerUserId } });
    if (!owner) {
      this.logger.warn(
        `Refund skipped: owner user ${ownerUserId} not found (listId=${listId}, count=${count})`,
      );
      return null;
    }

    const accountType = this.usesEnterpriseBalance(owner)
      ? CreditAccountType.ENTERPRISE
      : CreditAccountType.USER;
    const accountId =
      accountType === CreditAccountType.ENTERPRISE
        ? owner.enterpriseId!
        : owner.id;

    try {
      const result = await this.refundBulk(
        accountType,
        accountId,
        listId,
        count,
        { userId: ownerUserId },
      );

      // Bump the per-list refunded counter. Best-effort; ledger is authoritative.
      try {
        await this.dataSource.query(
          `UPDATE email_lists
             SET credits_refunded = credits_refunded + $1,
                 updated_at = now()
           WHERE id = $2`,
          [String(count), listId],
        );
      } catch (e) {
        this.logger.warn(
          `Failed to bump credits_refunded for list ${listId} (count=${count}): ${(e as Error).message}`,
        );
      }

      this.logger.log(
        `Refunded ${count} credit(s) for list ${listId} to ${accountType}=${accountId} (balanceAfter=${result.balanceAfter})`,
      );
      return result;
    } catch (e) {
      this.logger.error(
        `Refund FAILED for list ${listId} (account=${accountType}:${accountId}, count=${count}): ${(e as Error).message}`,
      );
      throw e;
    }
  }

  // ---------- Super Admin allocation ----------

  async allocateToUser(
    targetUserId: string,
    amount: number,
    adminId: string,
    description?: string,
  ): Promise<{ balanceAfter: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Allocation amount must be positive.');
    }
    return this.mutateByAccount(CreditAccountType.USER, targetUserId, {
      type: CreditTransactionType.ALLOCATION,
      reason: CreditTransactionReason.ADMIN_ALLOCATION,
      delta: amount,
      description: description ?? `Admin allocation: +${amount}`,
      createdByAdminId: adminId,
    });
  }

  async allocateToEnterprise(
    enterpriseId: string,
    amount: number,
    adminId: string,
    description?: string,
  ): Promise<{ balanceAfter: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Allocation amount must be positive.');
    }
    return this.mutateByAccount(
      CreditAccountType.ENTERPRISE,
      enterpriseId,
      {
        type: CreditTransactionType.ALLOCATION,
        reason: CreditTransactionReason.ADMIN_ALLOCATION,
        delta: amount,
        description: description ?? `Admin allocation: +${amount}`,
        createdByAdminId: adminId,
      },
    );
  }

  // ---------- Internal: locked mutation ----------

  private usesEnterpriseBalance(user: User): boolean {
    // Only ENTERPRISE_USER and ENTERPRISE_ADMIN draw from the shared
    // enterprise balance. USER and SUPER_ADMIN always use their own balance,
    // even if `enterpriseId` is set on the row (which validation prevents).
    return ENTERPRISE_ROLES.includes(user.role);
  }

  /** Apply a mutation to the account the user draws from. */
  private async mutate(
    user: User,
    opts: MutationOptions,
  ): Promise<{ balanceAfter: number }> {
    if (this.usesEnterpriseBalance(user)) {
      if (!user.enterpriseId) {
        throw new ForbiddenException('Enterprise account is missing.');
      }
      return this.mutateByAccount(
        CreditAccountType.ENTERPRISE,
        user.enterpriseId,
        opts,
      );
    }
    return this.mutateByAccount(CreditAccountType.USER, user.id, opts);
  }

  /**
   * Atomically (a) lock the account row, (b) verify sufficient funds for
   * debits, (c) update the balance, (d) write an immutable ledger entry.
   */
  private async mutateByAccount(
    accountType: CreditAccountType,
    accountId: string,
    opts: MutationOptions,
  ): Promise<{ balanceAfter: number }> {
    if (opts.delta === 0) {
      throw new BadRequestException('Credit delta must be non-zero.');
    }

    return this.dataSource.transaction(async (em) => {
      const balanceBefore = await this.lockAndReadBalance(
        em,
        accountType,
        accountId,
      );
      const balanceAfter = balanceBefore + opts.delta;
      if (balanceAfter < 0) {
        throw new InsufficientCreditsException(
          Math.abs(opts.delta),
          balanceBefore,
        );
      }

      await this.writeBalance(em, accountType, accountId, balanceAfter, opts);

      const tx = em.create(CreditTransaction, {
        accountType,
        accountId,
        userId: accountType === CreditAccountType.USER ? accountId : null,
        enterpriseId:
          accountType === CreditAccountType.ENTERPRISE ? accountId : null,
        type: opts.type,
        reason: opts.reason,
        delta: String(opts.delta),
        balanceAfter: String(balanceAfter),
        referenceType: opts.referenceType ?? null,
        referenceId: opts.referenceId ?? null,
        description: opts.description ?? null,
        createdByAdminId: opts.createdByAdminId ?? null,
        createdByUserId: opts.createdByUserId ?? null,
      });
      await em.save(tx);

      return { balanceAfter };
    });
  }

  private async lockAndReadBalance(
    em: EntityManager,
    accountType: CreditAccountType,
    accountId: string,
  ): Promise<number> {
    const table =
      accountType === CreditAccountType.ENTERPRISE ? 'enterprises' : 'users';
    const rows: { credit_balance: string }[] = await em.query(
      `SELECT credit_balance FROM "${table}" WHERE id = $1 FOR UPDATE`,
      [accountId],
    );
    if (rows.length === 0) {
      throw new BadRequestException(
        `${accountType} account ${accountId} not found.`,
      );
    }
    return Number(rows[0].credit_balance);
  }

  private async writeBalance(
    em: EntityManager,
    accountType: CreditAccountType,
    accountId: string,
    newBalance: number,
    opts: MutationOptions,
  ): Promise<void> {
    const table =
      accountType === CreditAccountType.ENTERPRISE ? 'enterprises' : 'users';

    // Track lifetime credits_used as a running positive total of all debits.
    // Refunds reduce credits_used; allocations don't affect it.
    const usedDelta = this.usedDeltaFor(opts);

    await em.query(
      `UPDATE "${table}"
         SET credit_balance = $1,
             credits_used   = GREATEST(0, credits_used + $2),
             updated_at     = now()
       WHERE id = $3`,
      [String(newBalance), usedDelta, accountId],
    );
  }

  /**
   * Converts the pending RESERVATION transaction for a bulk list to a DEDUCTION
   * once the job reaches a terminal (COMPLETED) state. This is a best-effort
   * update — callers must wrap in try/catch so a failure here does not block
   * the job from being marked done.
   */
  async finalizeReservation(listId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE credit_transactions
         SET type = $1
       WHERE reference_type = 'email_list'
         AND reference_id   = $2
         AND type           = $3`,
      [
        CreditTransactionType.DEDUCTION,
        listId,
        CreditTransactionType.RESERVATION,
      ],
    );
  }

  private usedDeltaFor(opts: MutationOptions): number {
    switch (opts.type) {
      case CreditTransactionType.DEDUCTION:
      case CreditTransactionType.RESERVATION:
        return -opts.delta; // delta is negative; usedDelta positive
      case CreditTransactionType.REFUND:
        return -opts.delta; // delta positive; usedDelta negative
      case CreditTransactionType.ALLOCATION:
      case CreditTransactionType.ADJUSTMENT:
      default:
        return 0;
    }
  }
}
