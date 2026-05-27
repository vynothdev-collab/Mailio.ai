import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, Repository } from 'typeorm';
import { Email } from '../emails/entities/email.entity';
import { Plan, User } from '../users/entities/user.entity';

export interface QueryUsersOptions {
  search?: string;
  plan?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
  ) {}

  async findAll(opts: QueryUsersOptions) {
    const page = Math.max(opts.page ?? 1, 1);
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.name',
        'u.email',
        'u.plan',
        'u.isActive',
        'u.emailVerified',
        'u.provider',
        'u.createdAt',
      ])
      .skip(skip)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');

    if (opts.search) {
      qb.andWhere('(u.name ILIKE :s OR u.email ILIKE :s)', {
        s: `%${opts.search}%`,
      });
    }
    if (opts.plan && Object.values(Plan).includes(opts.plan as Plan)) {
      qb.andWhere('u.plan = :plan', { plan: opts.plan });
    }
    if (opts.isActive !== undefined && opts.isActive !== '') {
      qb.andWhere('u.isActive = :active', {
        active: opts.isActive === 'true',
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      select: [
        'id',
        'name',
        'email',
        'plan',
        'isActive',
        'emailVerified',
        'emailVerifiedAt',
        'provider',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ],
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found.');

    const statsRows = await this.emailRepo.manager.query<
      Array<{ total: string; valid: string; invalid: string; risky: string }>
    >(
      `SELECT
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE verification_result = 'VALID')      AS valid,
        COUNT(*) FILTER (WHERE verification_result = 'INVALID')    AS invalid,
        COUNT(*) FILTER (WHERE verification_result = 'RISKY')      AS risky
      FROM emails
      WHERE user_id = $1 AND is_deleted = FALSE`,
      [id],
    );
    const stats = statsRows[0];

    return {
      ...user,
      verificationStats: {
        total: parseInt(stats?.total ?? '0', 10),
        valid: parseInt(stats?.valid ?? '0', 10),
        invalid: parseInt(stats?.invalid ?? '0', 10),
        risky: parseInt(stats?.risky ?? '0', 10),
      },
    };
  }

  async updateStatus(id: string, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    await this.userRepo.update(id, { isActive });
    return { success: true };
  }

  async resetPassword(id: string): Promise<{ tempPassword: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.provider !== 'LOCAL' as any) {
      throw new BadRequestException(
        'Cannot reset password for OAuth accounts.',
      );
    }
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.userRepo.update(id, { passwordHash });
    return { tempPassword };
  }

  async softDelete(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    await this.userRepo.update(id, { isActive: false });
    return { success: true };
  }

  private generateTempPassword(): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    return Array.from({ length: 12 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }
}
