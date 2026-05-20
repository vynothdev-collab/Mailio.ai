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
import { UsageService } from './usage.service';
import type { UsagePeriod, UsageType } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('quota')
  @ApiOperation({ summary: 'Current-period quota usage and plan limit' })
  @ApiResponse({ status: 200, description: 'Quota snapshot' })
  getQuota(@CurrentUser() user: User) {
    return this.usageService.getQuota(user.id, user.plan);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Single vs bulk totals over a period' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '14d', '30d'] })
  getBreakdown(
    @CurrentUser() user: User,
    @Query('period') period: UsagePeriod = '30d',
  ) {
    return this.usageService.getBreakdown(user.id, period);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Per-day usage breakdown for the chart' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '14d', '30d'] })
  getChart(
    @CurrentUser() user: User,
    @Query('period') period: UsagePeriod = '30d',
  ) {
    return this.usageService.getChart(user.id, period);
  }

  @Get('log')
  @ApiOperation({ summary: 'Paginated usage log — single + bulk merged' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'single', 'bulk'] })
  getLog(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('type') type: UsageType = 'all',
  ) {
    return this.usageService.getLog(user.id, page, limit, type);
  }
}
