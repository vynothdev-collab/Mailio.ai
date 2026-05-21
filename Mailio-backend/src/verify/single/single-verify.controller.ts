import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifyRateLimitGuard } from '../../common/guards/verify-rate-limit.guard';
import { User } from '../../users/entities/user.entity';
import { SingleVerifyService } from './single-verify.service';
import { VerifyEmailDto } from './verify-email.dto';

@ApiTags('single-verify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verify/single')
export class SingleVerifyController {
  constructor(private readonly singleVerifyService: SingleVerifyService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(VerifyRateLimitGuard)
  @ApiOperation({ summary: 'Verify a single email address (synchronous)' })
  @ApiResponse({ status: 429, description: 'Too many requests (50/min per user)' })
  @ApiResponse({
    status: 200,
    description: 'Verification result with all check details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email', example: 'test@example.com' },
        status: {
          type: 'string',
          enum: ['valid', 'invalid', 'risky', 'unknown'],
        },
        confidence: { type: 'number', example: 92 },
        description: {
          type: 'string',
          example: 'Email address is valid and accepting mail',
        },
        verifiedAt: { type: 'string', format: 'date-time' },
        durationMs: { type: 'number', example: 1240 },
        checks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: 'mx' },
              label: { type: 'string', example: 'MX Record' },
              value: { type: 'string', example: 'Found' },
              status: { type: 'string', enum: ['pass', 'fail', 'info'] },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid email address' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  verify(@Body() dto: VerifyEmailDto, @CurrentUser() user: User) {
    return this.singleVerifyService.verifySingle(dto.email, user.id);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Paginated history of single verifications' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated verification history',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              status: {
                type: 'string',
                enum: ['valid', 'invalid', 'risky', 'unknown'],
              },
              risk: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'unknown'],
              },
              verifiedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecent(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.singleVerifyService.getRecent(user.id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Single-verify stats for current user' })
  @ApiResponse({
    status: 200,
    description: 'Stats with period-over-period changes',
    schema: {
      type: 'object',
      properties: {
        todayCount: { type: 'number', example: 34 },
        successRate: { type: 'number', example: 87.5 },
        apiUsage: { type: 'number', example: 1240 },
        avgResponseMs: { type: 'number', example: 820 },
        changes: {
          type: 'object',
          properties: {
            todayCount: { type: 'string', example: '+12%' },
            successRate: { type: 'string', example: '+0%' },
            avgResponseMs: { type: 'string', example: '0ms' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@CurrentUser() user: User) {
    return this.singleVerifyService.getStats(user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download single verification result as CSV' })
  @ApiParam({ name: 'id', description: 'Email record UUID' })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'CSV file attachment',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.singleVerifyService.downloadSingle(
      id,
      user.id,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(csv);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a single verification record' })
  @ApiParam({ name: 'id', description: 'Email record UUID' })
  @ApiResponse({ status: 200, description: 'Record deleted' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.singleVerifyService.softDelete(id, user.id);
    return { success: true, message: 'Record deleted successfully' };
  }
}
