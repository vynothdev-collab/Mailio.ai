import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateEnterpriseUserDto {
  @ApiProperty({ example: 'Carol Member' })
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiProperty({ example: 'carol@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Initial password (>= 8 chars)' })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiPropertyOptional({
    description: 'Credits to allocate to this user on creation (>= 1)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  creditAllocation?: number;
}
