import { IsString, MinLength } from 'class-validator';

export class ChangeCrossDomainPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}
