import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { CreditsService } from '../credits/credits.service';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { MailService } from '../mail/mail.service';
import { AuthProvider, User, UserRole } from '../users/entities/user.entity';
import {
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
} from './dto/create-enterprise.dto';

interface ListEnterprisesOptions {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminEnterprisesService {
  private readonly logger = new Logger(AdminEnterprisesService.name);

  constructor(
    @InjectRepository(Enterprise)
    private readonly enterprisesRepo: Repository<Enterprise>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly credits: CreditsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateEnterpriseDto, adminId: string) {
    const adminEmail = dto.adminEmail.toLowerCase().trim();

    // Pre-flight validations BEFORE we create anything.
    const [existingEnterprise, existingUser] = await Promise.all([
      this.enterprisesRepo.findOne({
        where: { name: dto.name, deletedAt: IsNull() },
      }),
      this.usersRepo.findOne({ where: { email: adminEmail } }),
    ]);

    if (existingEnterprise) {
      throw new BadRequestException(
        `Enterprise "${dto.name}" already exists.`,
      );
    }

    // 1. Create the enterprise row.
    const enterprise = await this.enterprisesRepo.save(
      this.enterprisesRepo.create({
        name: dto.name,
        domain: dto.domain ?? null,
        createdByAdminId: adminId,
      }),
    );

    // 2. Create or upgrade the ENTERPRISE_ADMIN user. If the user with this
    // email already exists, we promote them to ENTERPRISE_ADMIN of the new
    // enterprise and reset their password to the one supplied here. If user
    // create/update fails, roll back the enterprise row.
    let adminUser: User;
    try {
      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

      if (existingUser) {
        existingUser.name = dto.adminName.trim();
        existingUser.passwordHash = passwordHash;
        existingUser.role = UserRole.ENTERPRISE_ADMIN;
        existingUser.enterpriseId = enterprise.id;
        existingUser.provider = AuthProvider.LOCAL;
        existingUser.emailVerified = true;
        existingUser.emailVerifiedAt =
          existingUser.emailVerifiedAt ?? new Date();
        existingUser.isActive = true;
        adminUser = await this.usersRepo.save(existingUser);
      } else {
        adminUser = await this.usersRepo.save(
          this.usersRepo.create({
            name: dto.adminName.trim(),
            email: adminEmail,
            passwordHash,
            role: UserRole.ENTERPRISE_ADMIN,
            enterpriseId: enterprise.id,
            createdByAdminId: adminId,
            provider: AuthProvider.LOCAL,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          }),
        );
      }
    } catch (err) {
      await this.enterprisesRepo.delete(enterprise.id);
      throw err;
    }

    // 3. Allocate initial credits to the enterprise (best-effort).
    if (dto.initialCredits && dto.initialCredits > 0) {
      await this.credits.allocateToEnterprise(
        enterprise.id,
        dto.initialCredits,
        adminId,
        'Initial allocation on creation',
      );
    }

    // 4. Email the credentials to the new admin. We don't fail the request
    // if email delivery fails — the user has been created — but we log it.
    const loginUrl = `${(this.config.get<string>('mail.frontendUrl') ?? '').replace(/\/$/, '')}/login`;
    try {
      await this.mail.sendEnterpriseAdminCredentialsEmail(
        adminUser.email,
        adminUser.name,
        dto.adminPassword,
        enterprise.name,
        loginUrl,
      );
    } catch (err) {
      this.logger.error(
        `Enterprise "${enterprise.name}" created but failed to email credentials to ${adminUser.email}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }

    return this.findOne(enterprise.id);
  }

  async findAll(opts: ListEnterprisesOptions) {
    const page = Math.max(opts.page ?? 1, 1);
    const limit = Math.min(opts.limit ?? 20, 100);

    const qb = this.enterprisesRepo
      .createQueryBuilder('e')
      .where('e.deletedAt IS NULL')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('e.createdAt', 'DESC');

    if (opts.search) {
      qb.andWhere('(e.name ILIKE :s OR e.domain ILIKE :s)', {
        s: `%${opts.search}%`,
      });
    }
    if (opts.isActive === 'true' || opts.isActive === 'false') {
      qb.andWhere('e.isActive = :a', { a: opts.isActive === 'true' });
    }

    const [rows, total] = await qb.getManyAndCount();

    // Hydrate user counts in one go.
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await this.usersRepo
          .createQueryBuilder('u')
          .select('u.enterpriseId', 'eid')
          .addSelect('COUNT(*)', 'cnt')
          .where('u.enterpriseId IN (:...ids)', { ids })
          .andWhere('u.isActive = true')
          .groupBy('u.enterpriseId')
          .getRawMany<{ eid: string; cnt: string }>()
      : [];
    const countMap = new Map(counts.map((c) => [c.eid, parseInt(c.cnt, 10)]));

    const data = rows.map((e) => this.toDto(e, countMap.get(e.id) ?? 0));
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const enterprise = await this.enterprisesRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!enterprise) throw new NotFoundException('Enterprise not found.');

    const [admins, members] = await Promise.all([
      this.usersRepo.count({
        where: {
          enterpriseId: id,
          role: UserRole.ENTERPRISE_ADMIN,
          isActive: true,
        },
      }),
      this.usersRepo.count({
        where: {
          enterpriseId: id,
          role: UserRole.ENTERPRISE_USER,
          isActive: true,
        },
      }),
    ]);

    return {
      ...this.toDto(enterprise, admins + members),
      adminsCount: admins,
      usersCount: members,
    };
  }

  async update(id: string, dto: UpdateEnterpriseDto) {
    const enterprise = await this.enterprisesRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!enterprise) throw new NotFoundException('Enterprise not found.');

    const patch: Partial<Enterprise> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.domain !== undefined) patch.domain = dto.domain;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    await this.enterprisesRepo.update(id, patch);
    return this.findOne(id);
  }

  async softDelete(id: string) {
    const enterprise = await this.enterprisesRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!enterprise) throw new NotFoundException('Enterprise not found.');
    await this.enterprisesRepo.update(id, {
      isActive: false,
      deletedAt: new Date(),
    });
    return { success: true };
  }

  async listMembers(
    enterpriseId: string,
    page = 1,
    limit = 50,
    role?: UserRole,
  ) {
    await this.findOne(enterpriseId); // validate exists

    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.enterpriseId = :id', { id: enterpriseId })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');
    if (role) qb.andWhere('u.role = :r', { r: role });

    const [rows, total] = await qb.getManyAndCount();
    const data = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
    return { data, total, page, limit };
  }

  private toDto(e: Enterprise, membersCount: number) {
    return {
      id: e.id,
      name: e.name,
      domain: e.domain,
      isActive: e.isActive,
      creditBalance: Number(e.creditBalance),
      creditsUsed: Number(e.creditsUsed),
      membersCount,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
