import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
    const { passwordHash: _, ...profile } = user;
    return profile;
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
        risky: { type: 'number', example: 70 },
        unknown: { type: 'number', example: 40 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@CurrentUser() user: User) {
    return this.usersService.getStats(user.id);
  }
}
