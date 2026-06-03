import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Length, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AllocateUserCreditsDto {
  @ApiProperty({ description: 'Enterprise user ID to allocate credits to.' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Credits to allocate (>= 1).', example: 500 })
  @IsInt()
  @Min(1)
  amount!: number;
}

export class ReallocateUserDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ minimum: 0, example: 400 })
  @IsInt()
  @Min(0)
  amount!: number;
}

export class ConfirmReallocationDto {
  @ApiProperty({ description: 'Plan ID being activated.' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ type: [ReallocateUserDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReallocateUserDto)
  allocations!: ReallocateUserDto[];
}

export class PurchasePlanDto {
  @ApiProperty({ description: 'Billing plan ID to activate.' })
  @IsUUID()
  planId!: string;
}

export class CreditSummaryUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}
