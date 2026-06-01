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
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminRole } from '../admin-auth/entities/admin.entity';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '';
}

@ApiTags('admin-users')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly logsService: AdminActivityLogsService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a user (Super Admin). Supports USER, ENTERPRISE_USER, ENTERPRISE_ADMIN, SUPER_ADMIN roles.',
  })
  @AdminRoles(AdminRole.SUPER_ADMIN)
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const user = await this.usersService.create(dto, admin.id);
    await this.logsService.log({
      type: LogType.SINGLE_USER,
      module: 'Users',
      action: `Created ${dto.role}`,
      targetId: user.id,
      targetName: user.email,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      newValue: {
        email: user.email,
        role: user.role,
        enterpriseId: user.enterpriseId,
      },
      ipAddress: getIp(req),
    });
    const { passwordHash, ...safe } = user;
    return safe;
  }

  @Get()
  @ApiOperation({ summary: 'List users with search and filters (role, enterprise, plan, status)' })
  findAll(
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('role') role?: string,
    @Query('enterpriseId') enterpriseId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll({
      search,
      plan,
      role,
      enterpriseId,
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
