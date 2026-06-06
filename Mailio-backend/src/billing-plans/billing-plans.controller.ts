import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BillingPlansService } from './billing-plans.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingPlansController {
  constructor(
    private readonly service: BillingPlansService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active plans available for this user role' })
  getPlans(@CurrentUser() user: User) {
    return this.service.getActivePlans(user.role);
  }

  @Post('plans/:planId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate (purchase) a plan — kept for backward compatibility',
  })
  activatePlan(
    @CurrentUser() user: User,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.service.activatePlan(user, planId);
  }

  @Post('plans/:planId/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purchase a validity-based plan (queued if active plan exists)',
  })
  async purchaseValidityPlan(
    @CurrentUser() user: User,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    if (user.role === UserRole.ENTERPRISE_ADMIN && user.enterpriseId) {
      const sub = await this.subscriptions.purchaseValidityPlanForEnterprise(
        user.enterpriseId,
        planId,
      );
      return { success: true, subscription: sub };
    }
    const sub = await this.subscriptions.purchaseValidityPlanForUser(
      user.id,
      planId,
    );
    return { success: true, subscription: sub };
  }

  @Post('plans/:planId/topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purchase a top-up plan (requires active base plan)',
  })
  async purchaseTopup(
    @CurrentUser() user: User,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    if (user.role === UserRole.ENTERPRISE_ADMIN && user.enterpriseId) {
      const sub = await this.subscriptions.purchaseTopupForEnterprise(
        user.enterpriseId,
        planId,
      );
      return { success: true, subscription: sub };
    }
    const sub = await this.subscriptions.purchaseTopupForUser(user.id, planId);
    return { success: true, subscription: sub };
  }

  @Get('subscription')
  @ApiOperation({
    summary: 'Current active + queued subscription info for this user',
  })
  getSubscription(@CurrentUser() user: User) {
    return this.service.getCurrentSubscription(user);
  }

  @Get('history')
  @ApiOperation({ summary: 'Credit transaction history for the current user' })
  getHistory(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.service.getCreditHistory(user.id, page, limit);
  }
}
