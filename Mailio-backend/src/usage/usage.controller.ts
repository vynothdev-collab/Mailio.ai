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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DataScopeService } from '../common/scope/data-scope.service';
import { User } from '../users/entities/user.entity';
import { UsageService } from './usage.service';
import type { UsagePeriod, UsageType } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(
    private readonly usageService: UsageService,
    private readonly scopeService: DataScopeService,
  ) {}

  @Get('quota')
  @ApiOperation({ summary: 'Credit balance and usage for the current account' })
  getQuota(@CurrentUser() user: User) {
    return this.usageService.getQuota(user);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Single vs bulk totals over a period' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '14d', '30d'] })
  async getBreakdown(
    @CurrentUser() user: User,
    @Query('period') period: UsagePeriod = '30d',
  ) {
    const userIds = await this.scopeService.resolveUserIds(user);
    return this.usageService.getBreakdown(userIds, period);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Per-day usage breakdown for the chart' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '14d', '30d'] })
  async getChart(
    @CurrentUser() user: User,
    @Query('period') period: UsagePeriod = '30d',
  ) {
    const userIds = await this.scopeService.resolveUserIds(user);
    return this.usageService.getChart(userIds, period);
  }

  @Get('log')
  @ApiOperation({ summary: 'Paginated usage log — single + bulk merged' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'single', 'bulk'] })
  async getLog(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('type') type: UsageType = 'all',
  ) {
    const userIds = await this.scopeService.resolveUserIds(user);
    return this.usageService.getLog(userIds, page, limit, type);
  }
}
