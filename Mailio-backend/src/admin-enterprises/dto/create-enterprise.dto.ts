import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateEnterpriseDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiPropertyOptional({ example: 'acme.com' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  domain?: string;

  @ApiProperty({
    description: 'Full name of the enterprise admin user.',
    example: 'Jane Doe',
  })
  @IsString()
  @Length(2, 255)
  adminName!: string;

  @ApiProperty({
    description: 'Login email for the enterprise admin user.',
    example: 'jane@acme.com',
  })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({
    description: 'Initial password for the enterprise admin (>= 8 chars).',
    example: 'Str0ngPass!',
  })
  @IsString()
  @Length(8, 128)
  adminPassword!: string;

  @ApiPropertyOptional({
    description: 'Optional initial credit allocation (>= 0).',
    example: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialCredits?: number;
}

export class UpdateEnterpriseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 255)
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
