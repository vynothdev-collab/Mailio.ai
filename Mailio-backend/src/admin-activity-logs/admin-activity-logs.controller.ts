import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import {
  AdminActivityLogsService,
  QueryLogsOptions,
} from './admin-activity-logs.service';
import { LogType } from './entities/admin-activity-log.entity';

@ApiTags('admin-activity-logs')
@UseGuards(AdminJwtGuard)
@Controller('admin/activity-logs')
export class AdminActivityLogsController {
  constructor(private readonly logsService: AdminActivityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List admin activity logs with filters' })
  findAll(
    @Query('type') type?: string,
    @Query('module') module?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const opts: QueryLogsOptions = {
      type: type === 'SYSTEM' ? LogType.SYSTEM : type === 'SINGLE_USER' ? LogType.SINGLE_USER : undefined,
      module,
      search,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.logsService.findAll(opts);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get distinct log module names for filter dropdown' })
  getModules() {
    return this.logsService.getModules();
  }
}
