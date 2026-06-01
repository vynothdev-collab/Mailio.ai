import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email } from '../emails/entities/email.entity';
import { VerificationResult } from '../common/types/verification-result.enum';
import {
  AuthProvider,
  User,
  UserRole,
} from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { CreateEnterpriseUserDto } from './dto/create-enterprise-user.dto';

@Injectable()
export class EnterpriseScopeService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Enterprise)
    private readonly enterprisesRepo: Repository<Enterprise>,
    @InjectRepository(Email)
    private readonly emailsRepo: Repository<Email>,
    @InjectRepository(EmailList)
    private readonly listsRepo: Repository<EmailList>,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
    private readonly mail: MailService,
  ) {}

  /**
   * Resolves the enterprise the calling admin belongs to and verifies it's
   * still active. Throws Forbidden if the admin is somehow without an
   * enterprise (data integrity issue).
   */
  private async resolveEnterprise(admin: User): Promise<Enterprise> {
    if (!admin.enterpriseId) {
      throw new ForbiddenException(
        'Your account is not attached to any enterprise.',
      );
    }
    const enterprise = await this.enterprisesRepo.findOne({
      where: { id: admin.enterpriseId, deletedAt: IsNull() },
    });
    if (!enterprise) {
      throw new ForbiddenException('Your enterprise no longer exists.');
    }
    if (!enterprise.isActive) {
      throw new ForbiddenException('Your enterprise is currently inactive.');
    }
    return enterprise;
  }

  // ---------- User management ----------

  async createUser(admin: User, dto: CreateEnterpriseUserDto) {
    const enterprise = await this.resolveEnterprise(admin);

    const existing = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.usersRepo.save(
      this.usersRepo.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        provider: AuthProvider.LOCAL,
        role: UserRole.ENTERPRISE_USER,
        enterpriseId: enterprise.id,
        createdByUserId: admin.id,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      }),
    );

    const loginUrl =
      process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/auth/login`
        : 'https://emailanswers.ai/auth/login';

    void this.mail.sendEnterpriseUserCredentialsEmail(
      created.email,
      created.name,
      dto.password,
      enterprise.name,
      loginUrl,
    );

    return this.serializeUser(created);
  }

  async listUsers(admin: User, page = 1, limit = 50) {
    const enterprise = await this.resolveEnterprise(admin);

    const p = Math.max(page, 1);
    const l = Math.min(Math.max(limit, 1), 100);

    const [rows, total] = await this.usersRepo.findAndCount({
      where: { enterpriseId: enterprise.id },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    return {
      data: rows.map((u) => this.serializeUser(u)),
      total,
      page: p,
      limit: l,
    };
  }

  async addExistingUser(admin: User, email: string) {
    const enterprise = await this.resolveEnterprise(admin);

    const user = await this.usersRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) throw new NotFoundException('No user found with that email.');
    if (user.id === admin.id)
      throw new BadRequestException('You cannot add yourself.');
    if (user.enterpriseId === enterprise.id)
      throw new ConflictException('User is already a member of your enterprise.');
    if (user.enterpriseId && user.enterpriseId !== enterprise.id)
      throw new BadRequestException('User belongs to a different enterprise.');

    user.enterpriseId = enterprise.id;
    user.role = UserRole.ENTERPRISE_USER;
    const saved = await this.usersRepo.save(user);

    const loginUrl =
      process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/auth/login`
        : 'https://emailanswers.ai/auth/login';

    void this.mail.sendEnterpriseUserAddedEmail(
      saved.email,
      saved.name,
      enterprise.name,
      loginUrl,
    );

    return this.serializeUser(saved);
  }

  async removeUser(admin: User, userId: string) {
    const enterprise = await this.resolveEnterprise(admin);

    const user = await this.usersRepo.findOne({
      where: { id: userId, enterpriseId: enterprise.id },
    });
    if (!user) throw new NotFoundException('User not found in your enterprise.');
    if (user.id === admin.id)
      throw new BadRequestException('You cannot remove yourself from the enterprise.');

    user.enterpriseId = null;
    user.role = UserRole.USER;
    await this.usersRepo.save(user);
    return { success: true };
  }

  // ---------- Enterprise overview (dashboard) ----------

  async getOverview(admin: User) {
    const enterprise = await this.resolveEnterprise(admin);

    const [usersAgg, listsAgg, emailsAgg] = await Promise.all([
      this.usersRepo
        .createQueryBuilder('u')
        .select('COUNT(*)', 'total')
        .addSelect(`COUNT(*) FILTER (WHERE u.role = :admin)`, 'admins')
        .addSelect(`COUNT(*) FILTER (WHERE u.role = :member)`, 'members')
        .addSelect(`COUNT(*) FILTER (WHERE u.is_active = true)`, 'active')
        .where('u.enterpriseId = :eid', { eid: enterprise.id })
        .setParameters({
          admin: UserRole.ENTERPRISE_ADMIN,
          member: UserRole.ENTERPRISE_USER,
        })
        .getRawOne<{
          total: string;
          admins: string;
          members: string;
          active: string;
        }>(),

      this.listsRepo
        .createQueryBuilder('l')
        .leftJoin('users', 'u', 'u.id = l.user_id')
        .select('COUNT(*)', 'totalJobs')
        .addSelect(
          `COUNT(*) FILTER (WHERE l.status = 'COMPLETED')`,
          'completedJobs',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE l.status = 'FAILED')`,
          'failedJobs',
        )
        .addSelect(`COALESCE(SUM(l.total_count), 0)`, 'totalEmailsInJobs')
        .where('u.enterprise_id = :eid', { eid: enterprise.id })
        .andWhere('l.is_deleted = false')
        .getRawOne<{
          totalJobs: string;
          completedJobs: string;
          failedJobs: string;
          totalEmailsInJobs: string;
        }>(),

      this.emailsRepo
        .createQueryBuilder('e')
        .leftJoin('users', 'u', 'u.id = e.user_id')
        .select('COUNT(*)', 'total')
        .addSelect(
          `COUNT(*) FILTER (WHERE e.verification_result = :valid)`,
          'valid',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE e.verification_result = :invalid)`,
          'invalid',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE e.verification_result = :catchall)`,
          'catchall',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE e.verification_result = :unknown)`,
          'unknown',
        )
        .where('u.enterprise_id = :eid', { eid: enterprise.id })
        .andWhere('e.is_deleted = false')
        .setParameters({
          valid: VerificationResult.VALID,
          invalid: VerificationResult.INVALID,
          catchall: VerificationResult.CATCHALL,
          unknown: VerificationResult.UNKNOWN,
        })
        .getRawOne<{
          total: string;
          valid: string;
          invalid: string;
          catchall: string;
          unknown: string;
        }>(),
    ]);

    return {
      enterprise: {
        id: enterprise.id,
        name: enterprise.name,
        domain: enterprise.domain,
        creditBalance: Number(enterprise.creditBalance),
        creditsUsed: Number(enterprise.creditsUsed),
      },
      users: {
        total: parseInt(usersAgg?.total ?? '0', 10),
        admins: parseInt(usersAgg?.admins ?? '0', 10),
        members: parseInt(usersAgg?.members ?? '0', 10),
        active: parseInt(usersAgg?.active ?? '0', 10),
      },
      jobs: {
        total: parseInt(listsAgg?.totalJobs ?? '0', 10),
        completed: parseInt(listsAgg?.completedJobs ?? '0', 10),
        failed: parseInt(listsAgg?.failedJobs ?? '0', 10),
        totalEmailsInJobs: parseInt(listsAgg?.totalEmailsInJobs ?? '0', 10),
      },
      verifications: {
        total: parseInt(emailsAgg?.total ?? '0', 10),
        valid: parseInt(emailsAgg?.valid ?? '0', 10),
        invalid: parseInt(emailsAgg?.invalid ?? '0', 10),
        catchall: parseInt(emailsAgg?.catchall ?? '0', 10),
        unknown: parseInt(emailsAgg?.unknown ?? '0', 10),
      },
    };
  }

  // ---------- Read-only credit ledger for this enterprise ----------

  async getLedger(admin: User, page = 1, limit = 50) {
    const enterprise = await this.resolveEnterprise(admin);

    const p = Math.max(page, 1);
    const l = Math.min(Math.max(limit, 1), 200);

    const [rows, total] = await this.txRepo.findAndCount({
      where: { enterpriseId: enterprise.id },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        reason: r.reason,
        delta: Number(r.delta),
        balanceAfter: Number(r.balanceAfter),
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        description: r.description,
        createdAt: r.createdAt,
      })),
      total,
      page: p,
      limit: l,
    };
  }

  // ---------- Read-only files (lists) scoped to the enterprise ----------

  async listFiles(admin: User, page = 1, limit = 25) {
    const enterprise = await this.resolveEnterprise(admin);

    const p = Math.max(page, 1);
    const l = Math.min(Math.max(limit, 1), 100);

    // Use a single query joining users to constrain by enterprise.
    const qb = this.listsRepo
      .createQueryBuilder('l')
      .leftJoinAndMapOne('l.user', User, 'u', 'u.id = l.userId')
      .where('u.enterpriseId = :eid', { eid: enterprise.id })
      .andWhere('l.isDeleted = false')
      .orderBy('l.createdAt', 'DESC')
      .skip((p - 1) * l)
      .take(l);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row: EmailList & { user?: User }) => ({
        jobId: row.id,
        fileName: row.originalFilename ?? row.name,
        status: row.status.toLowerCase(),
        totalEmails: row.totalCount,
        processedCount: row.processedCount,
        valid: row.validCount,
        invalid: row.invalidCount,
        catchall: row.catchallCount + row.unknownCount,
        disposable: row.disposableCount,
        createdAt: row.createdAt,
        uploadedBy: row.user
          ? { id: row.user.id, name: row.user.name, email: row.user.email }
          : null,
      })),
      total,
      page: p,
      limit: l,
    };
  }

  private serializeUser(u: User) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      enterpriseId: u.enterpriseId,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      creditsUsed: Number(u.creditsUsed ?? 0),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}
