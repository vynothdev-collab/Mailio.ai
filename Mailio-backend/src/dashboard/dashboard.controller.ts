import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';

@Controller()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiTags('dashboard')
  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Overall verification stats with period-over-period changes',
  })
  @ApiResponse({
    status: 200,
    description: '7-day summary with percentage changes vs previous period',
    schema: {
      type: 'object',
      properties: {
        totalVerified: { type: 'number', example: 8400 },
        validRate: { type: 'number', example: 78.5 },
        invalidRate: { type: 'number', example: 14.2 },
        riskyRate: { type: 'number', example: 5.6 },
        avgResponseMs: { type: 'number', example: 820 },
        changes: {
          type: 'object',
          properties: {
            totalVerified: { type: 'string', example: '+12%' },
            validRate: { type: 'string', example: '+2.1%' },
            avgResponseMs: { type: 'string', example: '-5%' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@CurrentUser() user: User) {
    return this.dashboardService.getStats(user.id);
  }

  @ApiTags('dashboard')
  @Get('dashboard/active-job')
  @ApiOperation({ summary: 'Currently active (processing) bulk job, or null' })
  @ApiResponse({
    status: 200,
    description: 'Active bulk job or null if none is running',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'leads-q1.csv' },
            totalCount: { type: 'number', example: 5000 },
            processedCount: { type: 'number', example: 1200 },
            percentage: { type: 'number', example: 24 },
          },
        },
        { type: 'null' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActiveJob(@CurrentUser() user: User) {
    return this.dashboardService.getActiveJob(user.id);
  }

  @ApiTags('dashboard')
  @Get('dashboard/recent-verifications')
  @ApiOperation({ summary: 'Recent verifications across single and bulk' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['queued', 'pending', 'completed', 'failed'],
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'custom', 'all'],
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-05-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-05-18T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated recent verification records',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              label: { type: 'string' },
              email: { type: 'string', format: 'email' },
              isBulk: { type: 'boolean' },
              status: {
                type: 'string',
                enum: ['queued', 'pending', 'completed', 'failed'],
              },
              verifiedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 240 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecent(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: 'queued' | 'pending' | 'completed' | 'failed',
    @Query('period') period?: 'today' | 'week' | 'custom' | 'all',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const range = this.resolveDateRange(period, from, to);
    return this.dashboardService.getRecentVerifications(user.id, page, limit, {
      status,
      from: range.from,
      to: range.to,
    });
  }

  private resolveDateRange(
    period?: string,
    from?: string,
    to?: string,
  ): { from?: Date; to?: Date } {
    if (period === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { from: start, to: new Date() };
    }
    if (period === 'week') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { from: start, to: new Date() };
    }
    if (period === 'custom') {
      return {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      };
    }
    return {};
  }

  @ApiTags('dashboard')
  @Get('dashboard/chart')
  @ApiOperation({
    summary: 'Verification result distribution for chart rendering',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: '7d | 14d | 30d',
    example: '7d',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily series data with result breakdown and colours',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: '7d' },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2026-05-07' },
              valid: { type: 'number', example: 120 },
              invalid: { type: 'number', example: 30 },
              risky: { type: 'number', example: 12 },
              unknown: { type: 'number', example: 5 },
            },
          },
        },
        colors: {
          type: 'object',
          properties: {
            valid: { type: 'string', example: '#22c55e' },
            invalid: { type: 'string', example: '#ef4444' },
            risky: { type: 'string', example: '#f59e0b' },
            unknown: { type: 'string', example: '#6b7280' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getChart(@CurrentUser() user: User, @Query('period') period = '7d') {
    return this.dashboardService.getChart(user.id, period);
  }

  @ApiTags('account')
  @Get('account/usage')
  @ApiOperation({ summary: 'API usage for current billing period' })
  @ApiResponse({
    status: 200,
    description: 'Current-period usage vs plan limit',
    schema: {
      type: 'object',
      properties: {
        used: { type: 'number', example: 3200 },
        limit: { type: 'number', example: 10000 },
        plan: { type: 'string', enum: ['PRO', 'ULTIMATE'], example: 'PRO' },
        percentage: { type: 'number', example: 32 },
        periodStart: { type: 'string', format: 'date-time' },
        periodEnd: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUsage(@CurrentUser() user: User) {
    return this.dashboardService.getUsage(user.id, user.plan);
  }
}
