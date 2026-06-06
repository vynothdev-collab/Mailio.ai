import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import {
  AdminSubscriptionExpiryService,
  ExpiryBucket,
  ExpiryTab,
} from './admin-subscription-expiry.service';

@ApiTags('admin-subscription-expiry')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/subscription-expiry')
export class AdminSubscriptionExpiryController {
  constructor(private readonly service: AdminSubscriptionExpiryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Top KPI counts (today / 7d / 30d / expired)' })
  summary(@Query('tab') tab: string = 'single') {
    return this.service.getSummary(this.tab(tab));
  }

  @Get('plans')
  @ApiOperation({
    summary: 'Distinct validity-based plans for the plan filter',
  })
  plans(@Query('tab') tab: string = 'single') {
    return this.service.listPlans(this.tab(tab));
  }

  @Get('users')
  @ApiOperation({ summary: 'Paginated expiring single-user subscriptions' })
  users(
    @Query('search') search?: string,
    @Query('planId') planId?: string,
    @Query('bucket') bucket?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listUsers({
      search,
      planId,
      bucket: this.bucket(bucket),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('enterprises')
  @ApiOperation({ summary: 'Paginated expiring enterprise subscriptions' })
  enterprises(
    @Query('search') search?: string,
    @Query('planId') planId?: string,
    @Query('bucket') bucket?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listEnterprises({
      search,
      planId,
      bucket: this.bucket(bucket),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  private tab(value: string): ExpiryTab {
    return value === 'enterprise' ? 'enterprise' : 'single';
  }

  private bucket(value?: string): ExpiryBucket | undefined {
    const allowed: ExpiryBucket[] = [
      'TODAY',
      'WEEK',
      'MONTH',
      'EXPIRED',
      'ACTIVE',
      'ALL',
    ];
    if (!value) return undefined;
    return (allowed as string[]).includes(value)
      ? (value as ExpiryBucket)
      : undefined;
  }
}
