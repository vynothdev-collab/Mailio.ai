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
import { ApiProperty } from '@nestjs/swagger';
import { BillingPlanType } from '../entities/billing-plan.entity';

export class CreateBillingPlanDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: BillingPlanType })
  @IsEnum(BillingPlanType)
  planType: BillingPlanType;

  @ApiProperty({ example: 499 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 10000 })
  @IsInt()
  @Min(1)
  credits: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  validityDays: number;

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
