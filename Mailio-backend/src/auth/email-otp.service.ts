import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { EmailOtp, OtpPurpose } from './entities/email-otp.entity';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class EmailOtpService {
  constructor(
    @InjectRepository(EmailOtp)
    private readonly otpRepo: Repository<EmailOtp>,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async issueAndSend(user: User, purpose = OtpPurpose.SIGNUP_VERIFY): Promise<void> {
    const expireMinutes =
      this.config.get<number>('mail.otpExpireMinutes') ?? 10;

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

    await this.mailService.sendOtpEmail(user.email, otp);
  }

  async resend(user: User): Promise<void> {
    const recent = await this.otpRepo.findOne({
      where: { email: user.email, purpose: OtpPurpose.SIGNUP_VERIFY },
      order: { createdAt: 'DESC' },
    });

    if (recent) {
      const ageMs = Date.now() - recent.createdAt.getTime();
      if (ageMs < RESEND_COOLDOWN_SECONDS * 1000) {
        const wait = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - ageMs) / 1000);
        throw new BadRequestException(
          `Please wait ${wait} seconds before requesting another code.`,
        );
      }
    }

    await this.issueAndSend(user);
  }

  async verify(email: string, otp: string): Promise<EmailOtp> {
    const record = await this.otpRepo.findOne({
      where: {
        email,
        purpose: OtpPurpose.SIGNUP_VERIFY,
        consumedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException('No verification code found. Please request a new one.');
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

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
