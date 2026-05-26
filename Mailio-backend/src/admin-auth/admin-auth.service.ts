import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminOtpService } from './admin-otp.service';
import { AdminDto } from './dto/admin-dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Admin, AdminRole } from './entities/admin.entity';

// Dummy hash used for constant-time comparison when admin email not found
const DUMMY_HASH =
  '$2b$10$abcdefghijklmnopqrstuvuDummyHashForTimingAttackPrevention';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly adminOtpService: AdminOtpService,
  ) {}

  async login(email: string, password: string): Promise<{ message: string }> {
    const admin = await this.adminRepo.findOne({ where: { email } });

    // Always run bcrypt.compare to prevent timing attacks on non-existent emails
    const hashToCompare = admin?.passwordHash ?? DUMMY_HASH;
    const valid = await bcrypt.compare(password, hashToCompare);

    if (!admin || !valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is disabled.');
    }

    await this.adminOtpService.issueAndSend(admin);

    return { message: 'OTP sent to your email.' };
  }

  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ accessToken: string; sessionToken: string; user: AdminDto }> {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin || !admin.isActive) {
      throw new NotFoundException('Admin not found.');
    }

    await this.adminOtpService.verify(email, otp);

    admin.lastLoginAt = new Date();
    await this.adminRepo.save(admin);

    return {
      accessToken: this.signAccessToken(admin),
      sessionToken: this.signSessionToken(admin),
      user: this.toAdminDto(admin),
    };
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    const admin = await this.adminRepo.findOne({ where: { email } });

    // Safe response even for unknown emails to prevent enumeration
    if (!admin || !admin.isActive) {
      return {
        message: 'If that email is registered, a new code has been sent.',
      };
    }

    await this.adminOtpService.resend(admin);
    return { message: 'Verification code sent.' };
  }

  async refreshAccessToken(
    sessionToken: string,
  ): Promise<{ accessToken: string }> {
    let payload: { sub: string; type: string };

    try {
      payload = this.jwtService.verify(sessionToken, {
        secret: this.config.get<string>('jwt.adminSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session token.');
    }

    if (payload.type !== 'admin-session') {
      throw new UnauthorizedException('Invalid token type.');
    }

    const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Account is inactive or not found.');
    }

    return { accessToken: this.signAccessToken(admin) };
  }

  async createAdmin(dto: CreateAdminDto): Promise<AdminDto> {
    const existing = await this.adminRepo.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(
        `An admin with email "${dto.email}" already exists.`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role ?? AdminRole.ADMIN,
      isActive: true,
    });

    await this.adminRepo.save(admin);
    return this.toAdminDto(admin);
  }

  async getMe(adminId: string): Promise<AdminDto> {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Account not found.');
    }
    return this.toAdminDto(admin);
  }

  private signAccessToken(admin: Admin): string {
    return this.jwtService.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin-access',
      },
      {
        secret: this.config.get<string>('jwt.adminSecret'),
        expiresIn: '15m',
      },
    );
  }

  private signSessionToken(admin: Admin): string {
    return this.jwtService.sign(
      { sub: admin.id, type: 'admin-session' },
      {
        secret: this.config.get<string>('jwt.adminSecret'),
        expiresIn: '30d',
      },
    );
  }

  private toAdminDto(admin: Admin): AdminDto {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }
}
