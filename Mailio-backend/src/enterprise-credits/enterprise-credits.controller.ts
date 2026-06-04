import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingPlan } from '../billing-plans/entities/billing-plan.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  AllocateUserCreditsDto,
  ConfirmReallocationDto,
  PurchasePlanDto,
} from './dto/allocate-user-credits.dto';
import { EnterpriseCreditsService } from './enterprise-credits.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('enterprise-credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enterprise/credits')
export class EnterpriseCreditsController {
  constructor(
    private readonly service: EnterpriseCreditsService,
    private readonly subscriptions: SubscriptionsService,
    @InjectRepository(Enterprise)
    private readonly enterpriseRepo: Repository<Enterprise>,
    @InjectRepository(BillingPlan)
    private readonly planRepo: Repository<BillingPlan>,
  ) {}

  private assertEnterpriseAdmin(user: User): void {
    if (user.role !== UserRole.ENTERPRISE_ADMIN || !user.enterpriseId) {
      throw new ForbiddenException('Only Enterprise Admins can access this.');
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Enterprise credit summary (Enterprise Admin)' })
  async getSummary(@CurrentUser() user: User) {
    this.assertEnterpriseAdmin(user);
    return this.service.getCreditSummary(user.enterpriseId!);
  }

  @Post('allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate credits to an enterprise user' })
  async allocate(
    @CurrentUser() user: User,
    @Body() dto: AllocateUserCreditsDto,
  ) {
    this.assertEnterpriseAdmin(user);
    await this.service.allocateToUser(
      user.enterpriseId!,
      dto.userId,
      dto.amount,
      user.id,
    );
    return { success: true };
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase a billing plan (Enterprise Admin)' })
  async purchase(@CurrentUser() user: User, @Body() dto: PurchasePlanDto) {
    this.assertEnterpriseAdmin(user);

    const [enterprise, plan] = await Promise.all([
      this.enterpriseRepo.findOne({ where: { id: user.enterpriseId! } }),
      this.planRepo.findOne({ where: { id: dto.planId, isActive: true } }),
    ]);
    if (!enterprise) throw new ForbiddenException('Enterprise not found.');
    if (!plan) throw new NotFoundException('Plan not found or inactive.');

    return this.service.purchasePlan(enterprise, plan, user.id);
  }

  @Post('reallocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm credit re-allocation after plan renewal' })
  async reallocate(
    @CurrentUser() user: User,
    @Body() dto: ConfirmReallocationDto,
  ) {
    this.assertEnterpriseAdmin(user);
    return this.service.confirmReallocation(
      user.enterpriseId!,
      dto.planId,
      dto.allocations,
      user.id,
    );
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase a top-up plan for the enterprise' })
  async topup(@CurrentUser() user: User, @Body() dto: PurchasePlanDto) {
    this.assertEnterpriseAdmin(user);
    const sub = await this.subscriptions.purchaseTopupForEnterprise(
      user.enterpriseId!,
      dto.planId,
    );
    return { success: true, subscription: sub };
  }

  @Get('subscription')
  @ApiOperation({
    summary: 'Current active + queued subscription view (enterprise)',
  })
  async getSubscription(@CurrentUser() user: User) {
    this.assertEnterpriseAdmin(user);
    return this.subscriptions.getCurrentSubscriptionForEnterprise(
      user.enterpriseId!,
    );
  }
}
