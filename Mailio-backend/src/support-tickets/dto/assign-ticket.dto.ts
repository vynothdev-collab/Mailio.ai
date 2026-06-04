import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({ description: 'Admin user id to assign the ticket to.' })
  @IsUUID()
  assignedAdminId!: string;
}
