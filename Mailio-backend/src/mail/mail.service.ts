import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { OtpPurpose } from '../auth/entities/email-otp.entity';

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

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (!this.configured) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    const subject = 'Reset your EmailAnswers.ai password';
    const text =
      `You requested a password reset.\n\n` +
      `Click the link below to reset your password (expires in 15 minutes):\n${resetLink}\n\n` +
      `If you didn't request this, you can safely ignore this email.`;
    const html = this.renderPasswordResetHtml(resetLink);

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
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }

  async sendOtpEmail(
    to: string,
    otp: string,
    purpose = OtpPurpose.SIGNUP_VERIFY,
  ): Promise<void> {
    if (!this.configured) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    const isReset = purpose === OtpPurpose.PASSWORD_RESET;
    const subject = isReset
      ? 'Your EmailAnswers.ai password reset code'
      : 'Your EmailAnswers.ai verification code';
    const text =
      `Your ${isReset ? 'password reset' : 'verification'} code is ${otp}.\n\n` +
      `It expires in ${this.otpExpireMinutes} minutes.\n\n` +
      `If you didn't request this, you can safely ignore this email.`;
    const html = this.renderOtpHtml(otp, purpose);

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
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
  }

  async sendAdminLoginOtpEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    if (!this.configured) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    const subject = 'Your Mailio Admin login code';
    const text =
      `Hi ${name},\n\n` +
      `Your admin login verification code is: ${otp}\n\n` +
      `It expires in ${this.otpExpireMinutes} minutes.\n\n` +
      `If you did not attempt to sign in, please secure your account immediately.`;
    const html = this.renderAdminOtpHtml(name, otp);

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
        `SendGrid admin OTP send failed (code=${sgErr?.code ?? 'n/a'}) to ${to}: ${detail}`,
      );
      throw new InternalServerErrorException('Failed to send admin login code');
    }
  }

  async sendEnterpriseUserCredentialsEmail(
    to: string,
    name: string,
    password: string,
    enterpriseName: string,
    loginUrl: string,
  ): Promise<void> {
    if (!this.configured) {
      this.logger.warn('Mail not configured — skipping enterprise user welcome email.');
      return;
    }
    const subject = `You have been added to ${enterpriseName} on Mailio`;
    const text =
      `Hi ${name},\n\n` +
      `You have been added to the enterprise account for ${enterpriseName} on Mailio.\n\n` +
      `Login URL: ${loginUrl}\n` +
      `Email:     ${to}\n` +
      `Password:  ${password}\n\n` +
      `For security, please change your password after your first sign-in.\n\n` +
      `If you did not expect this email, please contact your enterprise admin.`;
    const html = this.renderEnterpriseUserCredentialsHtml(
      name, to, password, enterpriseName, loginUrl,
    );
    try {
      await sgMail.send({
        to,
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        text,
        html,
      });
    } catch (err) {
      const sgErr = err as { message?: string; code?: number; response?: { body?: unknown } };
      const detail = sgErr?.response?.body !== undefined
        ? JSON.stringify(sgErr.response.body)
        : (sgErr?.message ?? 'Unknown error');
      this.logger.error(
        `SendGrid enterprise user credentials send failed (code=${sgErr?.code ?? 'n/a'}) to ${to}: ${detail}`,
      );
    }
  }

  async sendEnterpriseUserAddedEmail(
    to: string,
    name: string,
    enterpriseName: string,
    loginUrl: string,
  ): Promise<void> {
    if (!this.configured) {
      this.logger.warn('Mail not configured — skipping enterprise user added email.');
      return;
    }
    const subject = `You have been added to ${enterpriseName} on Mailio`;
    const text =
      `Hi ${name},\n\n` +
      `You have been added to the enterprise account for ${enterpriseName} on Mailio.\n` +
      `Sign in with your existing credentials at: ${loginUrl}\n\n` +
      `If you did not expect this email, please contact your enterprise admin.`;
    const html = this.renderEnterpriseUserAddedHtml(name, enterpriseName, loginUrl);
    try {
      await sgMail.send({
        to,
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        text,
        html,
      });
    } catch (err) {
      const sgErr = err as { message?: string; code?: number; response?: { body?: unknown } };
      const detail = sgErr?.response?.body !== undefined
        ? JSON.stringify(sgErr.response.body)
        : (sgErr?.message ?? 'Unknown error');
      this.logger.error(
        `SendGrid enterprise user added send failed (code=${sgErr?.code ?? 'n/a'}) to ${to}: ${detail}`,
      );
    }
  }

  async sendEnterpriseAdminCredentialsEmail(
    to: string,
    name: string,
    password: string,
    enterpriseName: string,
    loginUrl: string,
  ): Promise<void> {
    if (!this.configured) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    const subject = `Welcome to ${enterpriseName} on Mailio`;
    const text =
      `Hi ${name},\n\n` +
      `An enterprise account has been created for ${enterpriseName} on Mailio.\n` +
      `You have been assigned as the Enterprise Admin and can now sign in to manage your team.\n\n` +
      `Login URL: ${loginUrl}\n` +
      `Email:     ${to}\n` +
      `Password:  ${password}\n\n` +
      `For security, please change your password after your first sign-in.\n\n` +
      `If you did not expect this email, please contact support immediately.`;
    const html = this.renderEnterpriseAdminCredentialsHtml(
      name,
      to,
      password,
      enterpriseName,
      loginUrl,
    );

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
        `SendGrid enterprise admin credentials send failed (code=${sgErr?.code ?? 'n/a'}) to ${to}: ${detail}`,
      );
      throw new InternalServerErrorException(
        'Failed to send enterprise admin credentials email',
      );
    }
  }

  private renderEnterpriseUserCredentialsHtml(
    name: string,
    email: string,
    password: string,
    enterpriseName: string,
    loginUrl: string,
  ): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Mailio Enterprise Account</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: linear-gradient(135deg,#eef3fb 0%,#f8fbff 100%); font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; padding: 32px 16px; color: #001a66; }
    .email-wrapper { width: 100%; max-width: 560px; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px rgba(15,91,255,.12); border: 1px solid #e5ecf8; }
    .header { padding: 36px 32px 18px; text-align: center; }
    .content { padding: 10px 42px 32px; text-align: center; }
    .badge { display: inline-block; padding: 8px 14px; border-radius: 999px; background: #eef3fb; color: #0f5bff; font-size: 13px; font-weight: 700; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 26px; line-height: 1.3; color: #001a66; }
    .message { margin: 14px 0 0; color: #5f6b7a; font-size: 15px; line-height: 1.7; }
    .creds { margin: 24px 0 18px; background: #eef3fb; border: 1px solid #d9e6ff; border-radius: 14px; padding: 18px 22px; text-align: left; }
    .creds .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .creds .label { color: #5f6b7a; font-weight: 600; }
    .creds .val { color: #162D3A; font-weight: 700; word-break: break-all; text-align: right; }
    .btn-wrap { margin: 22px 0 6px; }
    .btn { display: inline-block; padding: 13px 30px; background: #0f5bff; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 700; }
    .warning { margin: 18px auto 0; max-width: 420px; color: #c0392b; font-size: 13px; line-height: 1.6; background: #fff5f5; border: 1px solid #fdd; border-radius: 8px; padding: 10px 14px; }
    .footer { background: #f8fbff; padding: 22px 32px; text-align: center; border-top: 1px solid #edf2f7; }
    .footer p { margin: 0; color: #9aa4b2; font-size: 12px; line-height: 1.6; }
    @media (max-width: 480px) { .content { padding: 8px 22px 28px; } h1 { font-size: 22px; } .creds .row { flex-direction: column; gap: 4px; } .creds .val { text-align: left; } }
  </style>
</head>
<body>
  <main class="email-wrapper">
    <section class="header">
      <img src="${this.frontendUrl}/brand-logo.svg" alt="Mailio" width="240" style="width:240px;max-width:100%;height:auto;display:inline-block;" />
    </section>
    <section class="content">
      <div class="badge">Enterprise Member</div>
      <h1>Welcome to ${enterpriseName}, ${name}!</h1>
      <p class="message">You have been added to the <strong>${enterpriseName}</strong> enterprise on Mailio. Use the credentials below to sign in and start verifying emails.</p>
      <div class="creds">
        <div class="row"><span class="label">Email</span><span class="val">${email}</span></div>
        <div class="row"><span class="label">Password</span><span class="val">${password}</span></div>
      </div>
      <div class="btn-wrap">
        <a href="${loginUrl}" class="btn">Sign in to Mailio</a>
      </div>
      <p class="warning">Please change your password immediately after signing in. Do not share these credentials with anyone.</p>
    </section>
    <section class="footer">
      <p>&copy; ${year} Mailio. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </section>
  </main>
</body>
</html>`;
  }

  private renderEnterpriseUserAddedHtml(
    name: string,
    enterpriseName: string,
    loginUrl: string,
  ): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Added to ${enterpriseName} on Mailio</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: linear-gradient(135deg,#eef3fb 0%,#f8fbff 100%); font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; padding: 32px 16px; color: #001a66; }
    .email-wrapper { width: 100%; max-width: 560px; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px rgba(15,91,255,.12); border: 1px solid #e5ecf8; }
    .header { padding: 36px 32px 18px; text-align: center; }
    .content { padding: 10px 42px 36px; text-align: center; }
    .badge { display: inline-block; padding: 8px 14px; border-radius: 999px; background: #eef3fb; color: #0f5bff; font-size: 13px; font-weight: 700; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 26px; line-height: 1.3; color: #001a66; }
    .message { margin: 14px 0 0; color: #5f6b7a; font-size: 15px; line-height: 1.7; }
    .info-box { margin: 24px 0; background: #eef3fb; border: 1px solid #d9e6ff; border-radius: 14px; padding: 18px 22px; color: #162D3A; font-size: 14px; line-height: 1.6; }
    .btn-wrap { margin: 22px 0 6px; }
    .btn { display: inline-block; padding: 13px 30px; background: #0f5bff; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 700; }
    .note { margin: 18px auto 0; max-width: 420px; color: #8a94a6; font-size: 13px; line-height: 1.6; }
    .footer { background: #f8fbff; padding: 22px 32px; text-align: center; border-top: 1px solid #edf2f7; }
    .footer p { margin: 0; color: #9aa4b2; font-size: 12px; line-height: 1.6; }
    @media (max-width: 480px) { .content { padding: 8px 22px 28px; } h1 { font-size: 22px; } }
  </style>
</head>
<body>
  <main class="email-wrapper">
    <section class="header">
      <img src="${this.frontendUrl}/brand-logo.svg" alt="Mailio" width="240" style="width:240px;max-width:100%;height:auto;display:inline-block;" />
    </section>
    <section class="content">
      <div class="badge">Enterprise Member</div>
      <h1>You have been added to ${enterpriseName}</h1>
      <p class="message">Hi <strong>${name}</strong>, your account has been added to the <strong>${enterpriseName}</strong> enterprise on Mailio. You can now access shared credits and verify emails on behalf of the organisation.</p>
      <div class="info-box">Sign in with your existing Mailio credentials — your email and password have not changed.</div>
      <div class="btn-wrap">
        <a href="${loginUrl}" class="btn">Go to Mailio</a>
      </div>
      <p class="note">If you did not expect this, please contact your enterprise administrator or Mailio support.</p>
    </section>
    <section class="footer">
      <p>&copy; ${year} Mailio. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </section>
  </main>
</body>
</html>`;
  }

  private renderEnterpriseAdminCredentialsHtml(
    name: string,
    email: string,
    password: string,
    enterpriseName: string,
    loginUrl: string,
  ): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Mailio Enterprise Admin Account</title>
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
    .content { padding: 10px 42px 32px; text-align: center; }
    .badge {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      background: #162D3A;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    h1 { margin: 0; font-size: 26px; line-height: 1.3; color: #001a66; }
    .message { margin: 14px 0 0; color: #5f6b7a; font-size: 15px; line-height: 1.7; }
    .creds {
      margin: 24px 0 18px;
      background: #eef3fb;
      border: 1px solid #d9e6ff;
      border-radius: 14px;
      padding: 18px 22px;
      text-align: left;
    }
    .creds .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .creds .label { color: #5f6b7a; font-weight: 600; }
    .creds .val { color: #162D3A; font-weight: 700; word-break: break-all; text-align: right; }
    .btn-wrap { margin: 22px 0 6px; }
    .btn {
      display: inline-block;
      padding: 13px 30px;
      background: #162D3A;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
    }
    .warning {
      margin: 18px auto 0;
      max-width: 420px;
      color: #c0392b;
      font-size: 13px;
      line-height: 1.6;
      background: #fff5f5;
      border: 1px solid #fdd;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .footer { background: #f8fbff; padding: 22px 32px; text-align: center; border-top: 1px solid #edf2f7; }
    .footer p { margin: 0; color: #9aa4b2; font-size: 12px; line-height: 1.6; }
    @media (max-width: 480px) {
      .content { padding: 8px 22px 28px; }
      h1 { font-size: 22px; }
      .creds .row { flex-direction: column; gap: 4px; }
      .creds .val { text-align: left; }
    }
  </style>
</head>
<body>
  <main class="email-wrapper">
    <section class="header">
      <img src="${this.frontendUrl}/brand-logo.svg" alt="Mailio" width="240" style="width:240px;max-width:100%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
    </section>

    <section class="content">
      <div class="badge">Enterprise Admin Access</div>
      <h1>Welcome, ${name}</h1>
      <p class="message">
        An enterprise account for <strong>${enterpriseName}</strong> has been created on Mailio.
        You have been assigned as the <strong>Enterprise Admin</strong>. Use the credentials below to sign in.
      </p>

      <div class="creds">
        <div class="row"><span class="label">Email</span><span class="val">${email}</span></div>
        <div class="row"><span class="label">Password</span><span class="val">${password}</span></div>
      </div>

      <div class="btn-wrap">
        <a href="${loginUrl}" class="btn">Sign in to Mailio</a>
      </div>

      <p class="warning">
        For your security, please change your password immediately after signing in.
        Do not share these credentials with anyone.
      </p>
    </section>

    <section class="footer">
      <p>&copy; ${year} Mailio. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </section>
  </main>
</body>
</html>`;
  }

  private renderAdminOtpHtml(name: string, otp: string): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mailio Admin Login Code</title>
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
      background: #162D3A;
      color: #ffffff;
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
      color: #162D3A;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      max-width: 310px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
    }
    .expiry { margin: 0; color: #5f6b7a; font-size: 14px; line-height: 1.6; }
    .expiry strong { color: #001a66; }
    .warning {
      margin: 18px auto 0;
      max-width: 390px;
      color: #c0392b;
      font-size: 13px;
      line-height: 1.6;
      background: #fff5f5;
      border: 1px solid #fdd;
      border-radius: 8px;
      padding: 10px 14px;
    }
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
      <div class="logo-row" aria-label="Mailio Admin">
        <img src="${this.frontendUrl}/brand-logo.svg" alt="Mailio" width="270" style="width:270px;max-width:100%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
      </div>
    </section>

    <section class="content">
      <div class="badge">Admin Access</div>
      <h1>Your login code</h1>
      <p class="message">
        Hi ${name}, use the code below to complete your admin sign-in.
      </p>

      <div class="otp-box">${otp}</div>

      <p class="expiry">
        This code will expire in <strong>${this.otpExpireMinutes} minutes</strong>.
      </p>
      <p class="warning">
        If you did not attempt to sign in to the Mailio Admin panel, please secure your account immediately and contact your system administrator.
      </p>
    </section>

    <section class="footer">
      <p>&copy; ${year} Mailio. All rights reserved.</p>
      <p>This is an automated security email. Please do not reply.</p>
    </section>
  </main>
</body>
</html>`;
  }

  private renderPasswordResetHtml(resetLink: string): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your EmailAnswers.ai password</title>
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
    .btn-wrap { margin: 30px auto 22px; }
    .reset-btn {
      display: inline-block;
      padding: 14px 36px;
      background: #162D3A;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .expiry { margin: 0; color: #5f6b7a; font-size: 14px; line-height: 1.6; }
    .expiry strong { color: #001a66; }
    .link-fallback { margin: 16px 0 0; color: #8a94a6; font-size: 12px; line-height: 1.6; word-break: break-all; }
    .warning { margin: 18px auto 0; max-width: 390px; color: #8a94a6; font-size: 13px; line-height: 1.6; }
    .footer { background: #f8fbff; padding: 22px 32px; text-align: center; border-top: 1px solid #edf2f7; }
    .footer p { margin: 0; color: #9aa4b2; font-size: 12px; line-height: 1.6; }
    @media (max-width: 480px) {
      .content { padding: 8px 24px 32px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <main class="email-wrapper">
    <section class="header">
      <div class="logo-row" aria-label="EmailAnswers.ai logo">
        <img src="${this.frontendUrl}/brand-logo.svg" alt="EmailAnswers.ai" width="270" style="width:270px;max-width:100%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
      </div>
    </section>

    <section class="content">
      <div class="badge">Password Reset</div>
      <h1>Reset your password</h1>
      <p class="message">
        We received a request to reset your EmailAnswers.ai password. Click the button below to choose a new password.
      </p>

      <div class="btn-wrap">
        <a href="${resetLink}" class="reset-btn">Reset Password</a>
      </div>

      <p class="expiry">
        This link will expire in <strong>15 minutes</strong>.
      </p>
      <p class="link-fallback">
        If the button above doesn't work, copy and paste this link into your browser:<br />${resetLink}
      </p>
      <p class="warning">
        If you did not request a password reset, you can safely ignore this email. Your password will not change.
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

  private renderOtpHtml(
    otp: string,
    purpose = OtpPurpose.SIGNUP_VERIFY,
  ): string {
    const isReset = purpose === OtpPurpose.PASSWORD_RESET;
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
      <div class="logo-row" aria-label="EmailAnswers.ai logo">
        <img src="${this.frontendUrl}/brand-logo.svg" alt="EmailAnswers.ai" width="270" style="width:270px;max-width:100%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
      </div>
    </section>

    <section class="content">
      <div class="badge">${isReset ? 'Password Reset' : 'Email Verification'}</div>
      <h1>${isReset ? 'Reset your password' : 'Verify your email address'}</h1>
      <p class="message">
        ${
          isReset
            ? 'Use the code below to reset your EmailAnswers.ai password.'
            : 'Use the verification code below to complete your signup and secure your EmailAnswers.ai account.'
        }
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
