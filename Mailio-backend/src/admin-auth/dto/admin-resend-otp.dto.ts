import { IsEmail } from 'class-validator';

export class AdminResendOtpDto {
  @IsEmail()
  email: string;
}
