import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminActivityLogsService } from '../admin-activity-logs/admin-activity-logs.service';
import { LogType } from '../admin-activity-logs/entities/admin-activity-log.entity';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { Admin, AdminRole } from '../admin-auth/entities/admin.entity';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { CreditAccountType } from '../credits/entities/credit-transaction.entity';
import { AdminCreditsService } from './admin-credits.service';
import {
  AllocateEnterpriseCreditsDto,
  AllocateUserCreditsDto,
} from './dto/allocate-credits.dto';

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '';
}

@ApiTags('admin-credits')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
@Controller('admin/credits')
export class AdminCreditsController {
  constructor(
    private readonly service: AdminCreditsService,
    private readonly logs: AdminActivityLogsService,
  ) {}

  @Post('allocate/user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate credits to a single user (Super Admin)' })
  async allocateUser(
    @Body() dto: AllocateUserCreditsDto,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const result = await this.service.allocateToUser(
      dto.userId,
      dto.amount,
      admin.id,
      dto.description,
    );
    await this.logs.log({
      type: LogType.SINGLE_USER,
      module: 'Credits',
      action: 'Allocated User Credits',
      targetId: dto.userId,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      newValue: {
        amount: dto.amount,
        balanceAfter: result.balanceAfter,
        description: dto.description ?? null,
      },
      ipAddress: getIp(req),
    });
    return result;
  }

  @Post('allocate/enterprise')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate credits to an enterprise (Super Admin)' })
  async allocateEnterprise(
    @Body() dto: AllocateEnterpriseCreditsDto,
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ) {
    const result = await this.service.allocateToEnterprise(
      dto.enterpriseId,
      dto.amount,
      admin.id,
      dto.description,
    );
    await this.logs.log({
      type: LogType.SYSTEM,
      module: 'Credits',
      action: 'Allocated Enterprise Credits',
      targetId: dto.enterpriseId,
      changedByAdminId: admin.id,
      changedByAdminName: admin.name,
      newValue: {
        amount: dto.amount,
        balanceAfter: result.balanceAfter,
        description: dto.description ?? null,
      },
      ipAddress: getIp(req),
    });
    return result;
  }

  @Get('ledger')
  @ApiOperation({ summary: 'List credit transactions (audit ledger)' })
  listLedger(
    @Query('accountType') accountType?: CreditAccountType,
    @Query('accountId') accountId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listLedger({
      accountType,
      accountId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Aggregate credit balances across the platform' })
  summary() {
    return this.service.getSummary();
  }
}
