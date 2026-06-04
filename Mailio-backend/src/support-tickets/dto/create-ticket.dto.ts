import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';
import { TicketType } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ example: 'Credits not added after payment' })
  @IsString()
  @Length(3, 150)
  subject!: string;

  @ApiProperty({ enum: TicketType })
  @IsEnum(TicketType)
  type!: TicketType;

  @ApiProperty({
    example: 'I purchased credits but they are not reflected in my account.',
  })
  @IsString()
  @Length(5, 5000)
  content!: string;
}
