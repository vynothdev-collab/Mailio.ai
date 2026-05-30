import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile (passwordHash omitted)',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Jane Doe' },
        email: { type: 'string', format: 'email' },
        plan: { type: 'string', enum: ['PRO', 'ULTIMATE'] },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User) {
    const { passwordHash, ...profile } = user;
    return { ...profile, hasPassword: passwordHash !== null };
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
