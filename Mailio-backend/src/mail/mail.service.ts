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
  private frontendUrl!: string;
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('mail.sendgridApiKey') ?? '';
    this.fromEmail = this.config.get<string>('mail.fromEmail') ?? '';
    this.fromName = this.config.get<string>('mail.fromName') ?? 'Mailio';
    this.otpExpireMinutes =
      this.config.get<number>('mail.otpExpireMinutes') ?? 10;
    this.frontendUrl = this.config.get<string>('mail.frontendUrl') ?? '';
    if (!this.frontendUrl) {
      this.logger.warn(
        'FRONTEND_URL is not set — email logo will not load. Set FRONTEND_URL in your .env.',
      );
    }

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

    const subject = 'Your EmailAnswers.ai verification code';
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
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EmailAnswers.ai verification code</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: linear-gradient(135deg, #eef3fb 0%, #f8fbff 100%);
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: #001a66;
    }
    .email-wrapper {
      width: 100%;
      max-width: 560px;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(15, 91, 255, 0.12);
      border: 1px solid #e5ecf8;
    }
    .header { padding: 36px 32px 18px; text-align: center; }
    .logo-row { width: 100%; text-align: center; }
    .content { padding: 10px 42px 36px; text-align: center; }
    .badge {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      background: #eef3fb;
      color: #0f5bff;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    h1 { margin: 0; font-size: 28px; line-height: 1.25; color: #001a66; }
    .message { margin: 16px 0 0; color: #5f6b7a; font-size: 15px; line-height: 1.7; }
    .otp-box {
      margin: 30px auto 22px;
      background: #eef3fb;
      border: 1px solid #d9e6ff;
      border-radius: 18px;
      padding: 20px 28px;
      color: #0f5bff;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      max-width: 310px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
    }
    .expiry { margin: 0; color: #5f6b7a; font-size: 14px; line-height: 1.6; }
    .expiry strong { color: #001a66; }
    .warning { margin: 18px auto 0; max-width: 390px; color: #8a94a6; font-size: 13px; line-height: 1.6; }
    .footer { background: #f8fbff; padding: 22px 32px; text-align: center; border-top: 1px solid #edf2f7; }
    .footer p { margin: 0; color: #9aa4b2; font-size: 12px; line-height: 1.6; }
    @media (max-width: 480px) {
      .content { padding: 8px 24px 32px; }
      h1 { font-size: 24px; }
      .otp-box { font-size: 30px; letter-spacing: 7px; padding: 18px 20px; }
    }
  </style>
</head>
<body>
  <main class="email-wrapper">
    <section class="header">
      // <div class="logo-row" aria-label="EmailAnswers.ai logo">
      //   <img src="${this.frontendUrl}/brand-logo.svg" alt="EmailAnswers.ai" width="270" style="width:270px;max-width:100%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
      // </div>
    </section>

    <section class="content">
      <div class="badge">Email Verification</div>
      <h1>Verify your email address</h1>
      <p class="message">
        Use the verification code below to complete your signup and secure your EmailAnswers.ai account.
      </p>

      <div class="otp-box">${otp}</div>

      <p class="expiry">
        This code will expire in <strong>${this.otpExpireMinutes} minutes</strong>.
      </p>
      <p class="warning">
        If you did not request this code, you can safely ignore this email. Please do not share this code with anyone.
      </p>
    </section>

    <section class="footer">
      <p>&copy; ${year} EmailAnswers.ai. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </section>
  </main>
</body>
</html>`;
  }
}
