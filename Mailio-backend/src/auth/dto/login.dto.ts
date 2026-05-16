import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ description: 'Stay logged in for 30 days' })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
