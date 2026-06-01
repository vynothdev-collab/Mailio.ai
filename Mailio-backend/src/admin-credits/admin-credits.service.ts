import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreditsService } from '../credits/credits.service';
import {
  CreditAccountType,
  CreditTransaction,
} from '../credits/entities/credit-transaction.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { User } from '../users/entities/user.entity';

interface ListLedgerOptions {
  accountType?: CreditAccountType;
  accountId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminCreditsService {
  constructor(
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Enterprise)
    private readonly enterprisesRepo: Repository<Enterprise>,
    private readonly credits: CreditsService,
  ) {}

  async allocateToUser(
    userId: string,
    amount: number,
    adminId: string,
    description?: string,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.isActive) {
      throw new BadRequestException(
        'Cannot allocate credits to an inactive user.',
      );
    }

    const { balanceAfter } = await this.credits.allocateToUser(
      userId,
      amount,
      adminId,
      description,
    );

    return {
      success: true,
      userId,
      amount,
      balanceAfter,
    };
  }

  async allocateToEnterprise(
    enterpriseId: string,
    amount: number,
    adminId: string,
    description?: string,
  ) {
    const enterprise = await this.enterprisesRepo.findOne({
      where: { id: enterpriseId, deletedAt: IsNull() },
    });
    if (!enterprise) {
      throw new NotFoundException(
        'Enterprise not found or has been deleted.',
      );
    }
    if (!enterprise.isActive) {
      throw new BadRequestException(
        'Cannot allocate credits to an inactive enterprise.',
      );
    }

    const { balanceAfter } = await this.credits.allocateToEnterprise(
      enterpriseId,
      amount,
      adminId,
      description,
    );

    return {
      success: true,
      enterpriseId,
      amount,
      balanceAfter,
    };
  }

  async listLedger(opts: ListLedgerOptions) {
    const page = Math.max(opts.page ?? 1, 1);
    const limit = Math.min(opts.limit ?? 50, 200);

    const qb = this.txRepo
      .createQueryBuilder('t')
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (opts.accountType) {
      qb.andWhere('t.accountType = :a', { a: opts.accountType });
    }
    if (opts.accountId) {
      qb.andWhere('t.accountId = :id', { id: opts.accountId });
    }

    const [rows, total] = await qb.getManyAndCount();
    const data = rows.map((r) => ({
      id: r.id,
      accountType: r.accountType,
      accountId: r.accountId,
      type: r.type,
      reason: r.reason,
      delta: Number(r.delta),
      balanceAfter: Number(r.balanceAfter),
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      description: r.description,
      createdByAdminId: r.createdByAdminId,
      createdByUserId: r.createdByUserId,
      createdAt: r.createdAt,
    }));
    return { data, total, page, limit };
  }

  async getSummary() {
    const [userAgg, enterpriseAgg] = await Promise.all([
      this.usersRepo
        .createQueryBuilder('u')
        .select('COALESCE(SUM(u.creditBalance), 0)', 'balance')
        .addSelect('COALESCE(SUM(u.creditsUsed), 0)', 'used')
        .where('u.isActive = true')
        .getRawOne<{ balance: string; used: string }>(),
      this.enterprisesRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.creditBalance), 0)', 'balance')
        .addSelect('COALESCE(SUM(e.creditsUsed), 0)', 'used')
        .where('e.isActive = true AND e.deletedAt IS NULL')
        .getRawOne<{ balance: string; used: string }>(),
    ]);

    return {
      users: {
        outstandingBalance: Number(userAgg?.balance ?? 0),
        lifetimeUsed: Number(userAgg?.used ?? 0),
      },
      enterprises: {
        outstandingBalance: Number(enterpriseAgg?.balance ?? 0),
        lifetimeUsed: Number(enterpriseAgg?.used ?? 0),
      },
    };
  }
}
