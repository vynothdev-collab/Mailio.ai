import { randomInt } from 'crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { Admin } from './entities/admin.entity';
import { AdminOtp } from './entities/admin-otp.entity';

const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWNS = [60, 180, 300] as const;
const OTP_EXPIRE_MINUTES = 10;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

@Injectable()
export class AdminOtpService {
  constructor(
    @InjectRepository(AdminOtp)
    private readonly otpRepo: Repository<AdminOtp>,
    private readonly mailService: MailService,
  ) {}

  async issueAndSend(admin: Admin): Promise<void> {
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );
    const recentCount = await this.otpRepo.count({
      where: { email: admin.email, createdAt: MoreThan(windowStart) },
    });

    if (recentCount >= RATE_LIMIT_COUNT) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

    const record = this.otpRepo.create({
      adminId: admin.id,
      email: admin.email,
      otpHash,
      expiresAt,
    });
    await this.otpRepo.save(record);

    await this.mailService.sendAdminLoginOtpEmail(admin.email, admin.name, otp);
  }

  async resend(admin: Admin): Promise<void> {
    const sentCount = await this.otpRepo.count({
      where: { email: admin.email },
    });

    const cooldownIndex = Math.min(sentCount - 1, RESEND_COOLDOWNS.length - 1);
    const cooldownSeconds = RESEND_COOLDOWNS[Math.max(cooldownIndex, 0)];

    const recent = await this.otpRepo.findOne({
      where: { email: admin.email },
      order: { createdAt: 'DESC' },
    });

    if (recent) {
      const ageMs = Date.now() - recent.createdAt.getTime();
      if (ageMs < cooldownSeconds * 1000) {
        const wait = Math.ceil((cooldownSeconds * 1000 - ageMs) / 1000);
        throw new BadRequestException(
          `Please wait ${wait} seconds before requesting another code.`,
        );
      }
    }

    await this.issueAndSend(admin);
  }

  async verify(email: string, otp: string): Promise<void> {
    const record = await this.otpRepo.findOne({
      where: { email, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException(
        'No verification code found. Please request a new one.',
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code has expired.');
    }

    if (record.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException(
        'Too many invalid attempts. Please request a new code.',
      );
    }

    const matches = await bcrypt.compare(otp, record.otpHash);
    if (!matches) {
      record.attemptCount += 1;
      await this.otpRepo.save(record);
      throw new BadRequestException('Invalid verification code.');
    }

    record.consumedAt = new Date();
    await this.otpRepo.save(record);
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
