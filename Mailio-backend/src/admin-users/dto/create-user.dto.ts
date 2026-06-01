import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Initial password (>= 8 chars)' })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    description:
      'Required when role is ENTERPRISE_USER or ENTERPRISE_ADMIN. Ignored for USER / SUPER_ADMIN.',
  })
  @ValidateIf((o) =>
    o.role === UserRole.ENTERPRISE_USER || o.role === UserRole.ENTERPRISE_ADMIN,
  )
  @IsUUID()
  enterpriseId?: string;

  @ApiPropertyOptional({
    description: 'Optional initial credits (USER only).',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialCredits?: number;
}
