import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PurchasePlanDto {
  @ApiProperty({ description: 'Billing plan ID to purchase.' })
  @IsUUID()
  planId!: string;
}
