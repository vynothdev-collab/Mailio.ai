import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EnterprisesService } from '../enterprises/enterprises.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ENTERPRISE_ROLES, User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly enterprisesService: EnterprisesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile including role, enterprise, and the credit balance applicable to this user (own balance for normal users; enterprise shared balance for enterprise users/admins).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: User) {
    const { passwordHash, ...profile } = user;

    // Resolve the effective credit balance for this caller. Enterprise members
    // see the shared enterprise balance; everyone else sees their own.
    let enterprise: {
      id: string;
      name: string;
      creditBalance: number;
      creditsUsed: number;
    } | null = null;
    let effectiveCreditBalance = Number(user.creditBalance ?? 0);

    if (user.enterpriseId && ENTERPRISE_ROLES.includes(user.role)) {
      const e = await this.enterprisesService.findById(user.enterpriseId);
      if (e) {
        enterprise = {
          id: e.id,
          name: e.name,
          creditBalance: Number(e.creditBalance),
          creditsUsed: Number(e.creditsUsed),
        };
        effectiveCreditBalance = Number(e.creditBalance);
      }
    }

    return {
      ...profile,
      creditBalance: Number(profile.creditBalance ?? 0),
      creditsUsed: Number(profile.creditsUsed ?? 0),
      hasPassword: passwordHash !== null,
      enterprise,
      effectiveCreditBalance,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.id, dto.name);
    const { passwordHash, ...profile } = updated;
    return { ...profile, hasPassword: passwordHash !== null };
  }

  @Post('me/change-password/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email for in-session password change' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  sendPasswordChangeOtp(@CurrentUser() user: User) {
    return this.usersService.sendPasswordChangeOtp(user);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password using OTP verification' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or current password' })
  changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get verification stats for current user' })
  @ApiResponse({
    status: 200,
    description: 'Lifetime verification counts',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 1240 },
        valid: { type: 'number', example: 950 },
        invalid: { type: 'number', example: 180 },
        catchall: { type: 'number', example: 70 },
        unknown: { type: 'number', example: 40 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@CurrentUser() user: User) {
    return this.usersService.getStats(user.id);
  }
}
