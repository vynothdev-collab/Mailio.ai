import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { ChangeEnterpriseUserPasswordDto } from './dto/change-enterprise-user-password.dto';
import { CreateEnterpriseUserDto } from './dto/create-enterprise-user.dto';
import { UpdateEnterpriseUserDto } from './dto/update-enterprise-user.dto';
import { EnterpriseScopeService } from './enterprise-scope.service';

@ApiTags('enterprise')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ENTERPRISE_ADMIN)
@Controller('enterprise')
export class EnterpriseScopeController {
  constructor(private readonly service: EnterpriseScopeService) {}

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an ENTERPRISE_USER under the calling admin enterprise.' })
  createUser(
    @CurrentUser() admin: User,
    @Body() dto: CreateEnterpriseUserDto,
  ) {
    return this.service.createUser(admin, dto);
  }

  @Post('users/add-existing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add an existing platform user to the calling admin enterprise.' })
  addExistingUser(
    @CurrentUser() admin: User,
    @Body() body: { email: string },
  ) {
    return this.service.addExistingUser(admin, body.email);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a user (blocks login, keeps in enterprise).' })
  softDeleteUser(
    @CurrentUser() admin: User,
    @Param('userId') userId: string,
  ) {
    return this.service.softDeleteUser(admin, userId);
  }

  @Patch('users/:userId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle active/inactive status for an enterprise user.' })
  toggleUserStatus(
    @CurrentUser() admin: User,
    @Param('userId') userId: string,
  ) {
    return this.service.toggleUserStatus(admin, userId);
  }

  @Patch('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update name/email for an enterprise user.' })
  updateUserDetails(
    @CurrentUser() admin: User,
    @Param('userId') userId: string,
    @Body() dto: UpdateEnterpriseUserDto,
  ) {
    return this.service.updateUserDetails(admin, userId, dto);
  }

  @Post('users/:userId/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for an enterprise user.' })
  changeUserPassword(
    @CurrentUser() admin: User,
    @Param('userId') userId: string,
    @Body() dto: ChangeEnterpriseUserPasswordDto,
  ) {
    return this.service.changeUserPassword(admin, userId, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users belonging to the calling admin enterprise.' })
  listUsers(
    @CurrentUser() admin: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.service.listUsers(admin, page, limit);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Aggregate dashboard stats for the calling admin enterprise.' })
  getOverview(@CurrentUser() admin: User) {
    return this.service.getOverview(admin);
  }

  @Get('credits/ledger')
  @ApiOperation({ summary: 'Read-only credit transactions for the enterprise.' })
  getLedger(
    @CurrentUser() admin: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.service.getLedger(admin, page, limit);
  }

  @Get('files')
  @ApiOperation({ summary: 'List all bulk-verify jobs across the enterprise (all members).' })
  listFiles(
    @CurrentUser() admin: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 25,
  ) {
    return this.service.listFiles(admin, page, limit);
  }
}
