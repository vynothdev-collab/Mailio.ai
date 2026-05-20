import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL ?? '',
  fromName: process.env.SENDGRID_FROM_NAME ?? 'Mailio',
  otpExpireMinutes: parseInt(process.env.OTP_EXPIRE_MINUTES ?? '10', 10),
}));
