import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminReportsService, AudienceTab } from './admin-reports.service';

@ApiTags('admin-reports')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Top KPI cards: verifications, valid rate, credits, revenue, offers',
  })
  summary(
    @Query('tab') tab: string = 'single',
    @Query('period') period: string = '7d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSummary(this.tab(tab), period, from, to);
  }

  @Get('verifications')
  @ApiOperation({ summary: 'Verification trend (line) + breakdown (pie)' })
  verifications(
    @Query('tab') tab: string = 'single',
    @Query('period') period: string = '7d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getVerifications(this.tab(tab), period, from, to);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Credits-by-plan + new signups trend' })
  distribution(
    @Query('tab') tab: string = 'single',
    @Query('period') period: string = '7d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getDistribution(this.tab(tab), period, from, to);
  }

  private tab(value: string): AudienceTab {
    return value === 'enterprise' ? 'enterprise' : 'single';
  }
}
