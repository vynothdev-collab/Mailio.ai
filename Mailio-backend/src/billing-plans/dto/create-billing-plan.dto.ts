import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPlanType, PlanCategory } from '../entities/billing-plan.entity';

export class CreateBillingPlanDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: BillingPlanType })
  @IsEnum(BillingPlanType)
  planType!: BillingPlanType;

  @ApiPropertyOptional({
    enum: PlanCategory,
    default: PlanCategory.VALIDITY_BASED,
  })
  @IsEnum(PlanCategory)
  @IsOptional()
  planCategory?: PlanCategory;

  @ApiProperty({ example: 499 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 10000 })
  @IsInt()
  @Min(1)
  credits!: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Required for VALIDITY_BASED plans; omit for TOPUP.',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  validityDays?: number;

  @ApiPropertyOptional({
    description: 'Free-form plan description shown to users.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: ['Email verification', 'Bulk processing'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
