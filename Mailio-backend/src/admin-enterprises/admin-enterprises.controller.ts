import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminActivityLogsService } from '../admin-activity-logs/admin-activity-logs.service';
import { LogType } from '../admin-activity-logs/entities/admin-activity-log.entity';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { Admin, AdminRole } from '../admin-auth/entities/admin.entity';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AdminEnterprisesService } from './admin-enterprises.service';
import {
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
} from './dto/create-enterprise.dto';

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '';
}

/**
 * Enterprise CRUD — restricted to SUPER_ADMIN.
 *
 * The `admins.role` column has two values, SUPER_ADMIN and ADMIN, but the
 * platform's documented role model only includes SUPER_ADMIN. The `ADMIN`
 * value is kept in the schema for backward compatibility / future support-staff
 * separation, but it currently grants no access to enterprise, credit, or
 * user-management endpoints.
 */
@ApiTags('admin-enterprises')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
@Controller('admin/enterprises')
export class AdminEnterprisesController {
  constructor(
    private readonly service: AdminEnterprisesService,
    private readonly logs: AdminActivityLogsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an enterprise (Super Admin)' })
  async create(
    @Body() dto: CreateEnterpriseDto,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const enterprise = await this.service.create(dto, admin.id);
    await this.logs.log({
      type: LogType.SYSTEM,
      module: 'Enterprises',
      action: 'Created Enterprise',
      targetId: enterprise.id,
      targetName: enterprise.name,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      newValue: enterprise as unknown as Record<string, unknown>,
      ipAddress: getIp(req),
    });
    return enterprise;
  }

  @Get()
  @ApiOperation({ summary: 'List enterprises with search/filter' })
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      isActive,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enterprise detail incl. member counts' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update enterprise (Super Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEnterpriseDto,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const before = await this.service.findOne(id);
    const after = await this.service.update(id, dto);
    await this.logs.log({
      type: LogType.SYSTEM,
      module: 'Enterprises',
      action: 'Updated Enterprise',
      targetId: id,
      targetName: after.name,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      oldValue: before as unknown as Record<string, unknown>,
      newValue: after as unknown as Record<string, unknown>,
      ipAddress: getIp(req),
    });
    return after;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete enterprise (Super Admin)' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const result = await this.service.softDelete(id);
    await this.logs.log({
      type: LogType.SYSTEM,
      module: 'Enterprises',
      action: 'Deleted Enterprise',
      targetId: id,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      ipAddress: getIp(req),
    });
    return result;
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List enterprise members (admins + users)' })
  listMembers(
    @Param('id') id: string,
    @Query('role') role?: UserRole,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.service.listMembers(id, page, limit, role);
  }
}
