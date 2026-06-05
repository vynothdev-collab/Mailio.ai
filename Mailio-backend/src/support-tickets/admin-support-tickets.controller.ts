import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { Admin, AdminRole } from '../admin-auth/entities/admin.entity';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketPriorityDto } from './dto/update-ticket-priority.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import {
  TicketCreatorRole,
  TicketPriority,
  TicketStatus,
  TicketType,
} from './entities/ticket.entity';
import {
  SupportTicketsService,
  type AdminTicketSort,
} from './support-tickets.service';

@ApiTags('admin-tickets')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/tickets')
export class AdminSupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List tickets with filters (admin)' })
  list(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('type') type?: TicketType,
    @Query('userType') userType?: TicketCreatorRole,
    @Query('userRole') userRole?: TicketCreatorRole, // alias kept for compat
    @Query('enterpriseId') enterpriseId?: string,
    @Query('enterpriseOnly') enterpriseOnly?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('from') from?: string, // alias
    @Query('to') to?: string, // alias
    @Query('sortBy') sortBy?: AdminTicketSort,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const startStr = dateFrom ?? from;
    const endStr = dateTo ?? to;
    return this.service.listForAdmin({
      status,
      priority,
      type,
      userRole: userType ?? userRole,
      enterpriseId,
      enterpriseOnly: enterpriseOnly === 'true',
      unreadOnly: unreadOnly === 'true',
      search,
      from: startStr ? new Date(startStr) : undefined,
      to: endStr ? new Date(endStr) : undefined,
      sortBy,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Ticket counts by status' })
  stats() {
    return this.service.adminStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Full ticket detail with thread + user/enterprise info',
  })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTicketForAdmin(id);
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin reply to a ticket' })
  reply(
    @CurrentAdmin() admin: Admin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    const isSuper = admin.role === AdminRole.SUPER_ADMIN;
    return this.service.replyAsAdmin(admin.id, isSuper, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Update ticket priority (manual override)' })
  updatePriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketPriorityDto,
  ) {
    return this.service.updatePriority(id, dto.priority);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign a ticket to a specific admin' })
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTicketDto) {
    return this.service.assign(id, dto.assignedAdminId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a ticket' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }

  @Delete(':ticketId/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an attachment + remove the S3 object' })
  removeAttachment(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.service.deleteAttachmentForAdmin(ticketId, attachmentId);
  }
}
