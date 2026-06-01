import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export class AllocateUserCreditsDto {
  @ApiProperty({ description: 'Target user UUID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Credit amount to add (> 0)', example: 1000 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AllocateEnterpriseCreditsDto {
  @ApiProperty({ description: 'Target enterprise UUID' })
  @IsUUID()
  enterpriseId!: string;

  @ApiProperty({ description: 'Credit amount to add (> 0)', example: 10000 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
