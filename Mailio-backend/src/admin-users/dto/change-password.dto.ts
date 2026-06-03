import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'New password (>= 8 chars)' })
  @IsString()
  @Length(8, 128)
  password!: string;
}
