import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';

/**
 * Resolves which user IDs an authenticated actor can "see".
 *
 * - ENTERPRISE_ADMIN: every user belonging to the same enterprise
 * - Everyone else (USER, ENTERPRISE_USER, SUPER_ADMIN): just themselves
 *
 * This is the central place that decides "my data" vs "enterprise-wide data"
 * for read endpoints (dashboard, email lists, single-verify history, etc.).
 */
@Injectable()
export class DataScopeService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async resolveUserIds(user: User): Promise<string[]> {
    if (user.role === UserRole.ENTERPRISE_ADMIN && user.enterpriseId) {
      const rows = await this.usersRepo.find({
        where: { enterpriseId: user.enterpriseId },
        select: ['id'],
      });
      const ids = rows.map((r) => r.id);
      // Always include self even if not joined to the enterprise via the query.
      if (!ids.includes(user.id)) ids.push(user.id);
      return ids;
    }
    return [user.id];
  }

  /**
   * True when the actor reads enterprise-wide data instead of just their own.
   */
  isEnterpriseScoped(user: User): boolean {
    return user.role === UserRole.ENTERPRISE_ADMIN && !!user.enterpriseId;
  }
}
