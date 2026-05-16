import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiKeyStatus } from '../../providers/entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(64)
  provider: string;

  @IsString()
  keyValue: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  weight?: number;

  @IsInt()
  @Min(1)
  rlMax: number;

  @IsInt()
  @Min(100)
  rlWindowMs: number;

  @IsOptional()
  @IsInt()
  monthlyQuota?: number;
}

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rlMax?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  rlWindowMs?: number;

  @IsOptional()
  @IsInt()
  monthlyQuota?: number;
}
