import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private fromEmail!: string;
  private fromName!: string;
  private otpExpireMinutes!: number;
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('mail.sendgridApiKey') ?? '';
    this.fromEmail = this.config.get<string>('mail.fromEmail') ?? '';
    this.fromName = this.config.get<string>('mail.fromName') ?? 'Mailio';
    this.otpExpireMinutes =
      this.config.get<number>('mail.otpExpireMinutes') ?? 10;

    if (!apiKey || !this.fromEmail) {
      this.logger.warn(
        'SendGrid not configured — SENDGRID_API_KEY / SENDGRID_FROM_EMAIL missing.',
      );
      return;
    }
    sgMail.setApiKey(apiKey);
    this.configured = true;
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!this.configured) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    const subject = 'Your Mailio verification code';
    const text =
      `Your verification code is ${otp}.\n\n` +
      `It expires in ${this.otpExpireMinutes} minutes.\n\n` +
      `If you didn't request this, you can safely ignore this email.`;
    const html = this.renderOtpHtml(otp);

    try {
      await sgMail.send({
        to,
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        text,
        html,
      });
    } catch (err) {
      const sgErr = err as {
        message?: string;
        code?: number;
        response?: { body?: unknown };
      };
      const detail =
        sgErr?.response?.body !== undefined
          ? JSON.stringify(sgErr.response.body)
          : (sgErr?.message ?? 'Unknown error');
      this.logger.error(
        `SendGrid send failed (code=${sgErr?.code ?? 'n/a'}) to ${to}: ${detail}`,
      );
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }

  private renderOtpHtml(otp: string): string {
    return `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#161514;">
        <h2 style="margin:0 0 12px 0;">Verify your email</h2>
        <p style="margin:0 0 16px 0;color:#555;">Use the code below to finish creating your Mailio account.</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0F5BFF;background:#E6EEFB;padding:16px 24px;border-radius:12px;text-align:center;">${otp}</div>
        <p style="margin:16px 0 0 0;color:#666;font-size:13px;">This code expires in ${this.otpExpireMinutes} minutes.</p>
        <p style="margin:8px 0 0 0;color:#888;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
  }
}
