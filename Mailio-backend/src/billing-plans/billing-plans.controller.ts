import {
  Controller,
  Get,
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
import { User } from '../users/entities/user.entity';
import { BillingPlansService } from './billing-plans.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingPlansController {
  constructor(private readonly service: BillingPlansService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active plans available for this user role' })
  getPlans(@CurrentUser() user: User) {
    return this.service.getActivePlans(user.role);
  }

  @Post('plans/:planId/activate')
  @ApiOperation({ summary: 'Activate a plan and allocate its credits to user' })
  activatePlan(
    @CurrentUser() user: User,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.service.activatePlan(user, planId);
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
