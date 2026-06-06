import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';

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

      if (!ids.includes(user.id)) ids.push(user.id);
      return ids;
    }
    return [user.id];
  }

  isEnterpriseScoped(user: User): boolean {
    return user.role === UserRole.ENTERPRISE_ADMIN && !!user.enterpriseId;
  }
}
