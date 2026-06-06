import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminDashboardService, OverviewTab } from './admin-dashboard.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Consolidated admin dashboard overview. One call returns KPIs, charts, lists for the selected tab.',
  })
  getOverview(
    @Query('tab') tab?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const safeTab: OverviewTab = tab === 'enterprise' ? 'enterprise' : 'single';
    return this.dashboardService.getOverview(safeTab, period, from, to);
  }
}
