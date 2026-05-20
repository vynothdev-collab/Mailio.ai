import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmailListDto {
  @ApiProperty({ example: 'My Campaign List' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Override the auto-detected filename' })
  @IsOptional()
  @IsString()
  description?: string;
}
