import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ReplyTicketDto {
  @ApiProperty({
    example: 'Thanks for the update — could you share the order ID?',
  })
  @IsString()
  @Length(1, 5000)
  message!: string;
}
