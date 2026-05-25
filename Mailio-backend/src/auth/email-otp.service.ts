import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { EmailOtp, OtpPurpose } from './entities/email-otp.entity';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWNS = [60, 180, 300] as const;

@Injectable()
export class EmailOtpService {
  constructor(
    @InjectRepository(EmailOtp)
    private readonly otpRepo: Repository<EmailOtp>,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async issueAndSend(
    user: User,
    purpose = OtpPurpose.SIGNUP_VERIFY,
  ): Promise<void> {
    const expireMinutes =
      this.config.get<number>('mail.otpExpireMinutes') ?? 5;

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    const record = this.otpRepo.create({
      userId: user.id,
      email: user.email,
      otpHash,
      purpose,
      expiresAt,
    });
    await this.otpRepo.save(record);

    await this.mailService.sendOtpEmail(user.email, otp, purpose);
  }

  async resend(user: User, purpose = OtpPurpose.SIGNUP_VERIFY): Promise<void> {
    const sentCount = await this.otpRepo.count({
      where: { email: user.email, purpose },
    });

    const cooldownIndex = Math.min(sentCount - 1, RESEND_COOLDOWNS.length - 1);
    const cooldownSeconds = RESEND_COOLDOWNS[Math.max(cooldownIndex, 0)];

    const recent = await this.otpRepo.findOne({
      where: { email: user.email, purpose },
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

    await this.issueAndSend(user, purpose);
  }

  async getStatus(
    email: string,
    purpose = OtpPurpose.SIGNUP_VERIFY,
  ): Promise<{ remainingSeconds: number; sendCount: number }> {
    const sendCount = await this.otpRepo.count({
      where: { email, purpose },
    });

    if (sendCount === 0) return { remainingSeconds: 0, sendCount: 0 };

    const recent = await this.otpRepo.findOne({
      where: { email, purpose },
      order: { createdAt: 'DESC' },
    });

    if (!recent) return { remainingSeconds: 0, sendCount: 0 };

    const cooldownIndex = Math.min(sendCount - 1, RESEND_COOLDOWNS.length - 1);
    const cooldownSeconds = RESEND_COOLDOWNS[Math.max(cooldownIndex, 0)];
    const ageMs = Date.now() - recent.createdAt.getTime();
    const remainingSeconds = Math.max(
      Math.ceil((cooldownSeconds * 1000 - ageMs) / 1000),
      0,
    );

    return { remainingSeconds, sendCount };
  }

  async verify(
    email: string,
    otp: string,
    purpose = OtpPurpose.SIGNUP_VERIFY,
  ): Promise<EmailOtp> {
    const record = await this.otpRepo.findOne({
      where: { email, purpose, consumedAt: IsNull() },
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

    if (record.attemptCount >= MAX_ATTEMPTS) {
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
    return record;
  }

  async countRecentRequests(
    email: string,
    purpose: OtpPurpose,
    windowMinutes: number,
  ): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    return this.otpRepo.count({
      where: { email, purpose, createdAt: MoreThan(since) },
    });
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
