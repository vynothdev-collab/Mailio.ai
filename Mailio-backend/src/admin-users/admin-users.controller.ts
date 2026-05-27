import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { Admin } from '../admin-auth/entities/admin.entity';
import { AdminActivityLogsService } from '../admin-activity-logs/admin-activity-logs.service';
import { LogType } from '../admin-activity-logs/entities/admin-activity-log.entity';
import { AdminUsersService } from './admin-users.service';

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '';
}

@ApiTags('admin-users')
@UseGuards(AdminJwtGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly logsService: AdminActivityLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all single users with search and filters' })
  findAll(
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll({
      search,
      plan,
      isActive,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single user detail with verification stats' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const result = await this.usersService.updateStatus(id, body.isActive);
    await this.logsService.log({
      type: LogType.SINGLE_USER,
      module: 'Users',
      action: body.isActive ? 'Activated User' : 'Deactivated User',
      targetId: id,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      newValue: { isActive: body.isActive },
      ipAddress: getIp(req),
    });
    return result;
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password and return temp password' })
  async resetPassword(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const result = await this.usersService.resetPassword(id);
    await this.logsService.log({
      type: LogType.SINGLE_USER,
      module: 'Users',
      action: 'Reset Password',
      targetId: id,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      ipAddress: getIp(req),
    });
    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete (deactivate) a user' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const result = await this.usersService.softDelete(id);
    await this.logsService.log({
      type: LogType.SINGLE_USER,
      module: 'Users',
      action: 'Deleted User',
      targetId: id,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      ipAddress: getIp(req),
    });
    return result;
  }
}
