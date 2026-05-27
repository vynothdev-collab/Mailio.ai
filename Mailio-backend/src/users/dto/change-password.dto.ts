import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
