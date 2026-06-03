import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class AddCreditsDto {
  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'Promotional top-up by admin' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}
