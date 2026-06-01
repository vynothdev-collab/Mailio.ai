import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { Admin, AdminRole } from '../admin-auth/entities/admin.entity';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminBillingPlansService } from './admin-billing-plans.service';
import { CreateBillingPlanDto } from './dto/create-billing-plan.dto';

@ApiTags('admin-billing-plans')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
@Controller('admin/plans')
export class AdminBillingPlansController {
  constructor(private readonly service: AdminBillingPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List all billing plans' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a billing plan' })
  create(@Body() dto: CreateBillingPlanDto, @CurrentAdmin() admin: Admin) {
    return this.service.create(dto, admin.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a billing plan' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
    return { success: true };
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle plan active/inactive' })
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleActive(id);
  }
}
