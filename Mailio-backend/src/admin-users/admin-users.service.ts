import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { CreditsService } from '../credits/credits.service';
import { Email } from '../emails/entities/email.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import {
  AuthProvider,
  Plan,
  User,
  UserRole,
} from '../users/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

export interface QueryUsersOptions {
  search?: string;
  plan?: string;
  isActive?: string;
  role?: string;
  enterpriseId?: string;
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
    @InjectRepository(Enterprise)
    private readonly enterpriseRepo: Repository<Enterprise>,
    private readonly credits: CreditsService,
  ) {}

  async create(dto: CreateUserDto, adminId: string): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered.');
    }

    const isEnterpriseRole =
      dto.role === UserRole.ENTERPRISE_USER ||
      dto.role === UserRole.ENTERPRISE_ADMIN;

    let enterpriseId: string | null = null;
    if (isEnterpriseRole) {
      if (!dto.enterpriseId) {
        throw new BadRequestException(
          'enterpriseId is required for ENTERPRISE_USER and ENTERPRISE_ADMIN roles.',
        );
      }
      const enterprise = await this.enterpriseRepo.findOne({
        where: { id: dto.enterpriseId, deletedAt: IsNull() },
      });
      if (!enterprise) {
        throw new NotFoundException(
          'Enterprise not found or has been deleted.',
        );
      }
      if (!enterprise.isActive) {
        throw new BadRequestException(
          'Cannot create users for an inactive enterprise.',
        );
      }
      enterpriseId = enterprise.id;
    } else if (dto.enterpriseId) {
      // Hard reject — silently dropping the field would let callers think a
      // SUPER_ADMIN was attached to an enterprise when it wasn't.
      throw new BadRequestException(
        `enterpriseId must not be set for role=${dto.role}. Only ENTERPRISE_USER and ENTERPRISE_ADMIN can belong to an enterprise.`,
      );
    }

    if (dto.initialCredits != null && dto.initialCredits > 0) {
      if (dto.role !== UserRole.USER) {
        throw new BadRequestException(
          `initialCredits is only valid for role=USER (got role=${dto.role}). ` +
            `Enterprise members share the enterprise balance — allocate to the enterprise instead.`,
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        provider: AuthProvider.LOCAL,
        role: dto.role,
        enterpriseId,
        createdByAdminId: adminId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      }),
    );

    if (dto.initialCredits && dto.initialCredits > 0) {
      await this.credits.allocateToUser(
        user.id,
        dto.initialCredits,
        adminId,
        'Initial allocation on user creation',
      );
    }

    return this.userRepo.findOneOrFail({ where: { id: user.id } });
  }

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
        'u.role',
        'u.enterpriseId',
        'u.creditBalance',
        'u.creditsUsed',
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
    if (opts.role && Object.values(UserRole).includes(opts.role as UserRole)) {
      qb.andWhere('u.role = :role', { role: opts.role });
    }
    if (opts.enterpriseId) {
      qb.andWhere('u.enterpriseId = :eid', { eid: opts.enterpriseId });
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
