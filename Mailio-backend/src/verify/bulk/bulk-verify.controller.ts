import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../users/entities/user.entity';
import { BulkVerifyService } from './bulk-verify.service';

const JOB_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'leads-2024-q1.csv' },
    status: {
      type: 'string',
      enum: ['pending', 'processing', 'completed', 'failed'],
    },
    totalCount: { type: 'number', example: 5000 },
    processedCount: { type: 'number', example: 1200 },
    validCount: { type: 'number', example: 900 },
    invalidCount: { type: 'number', example: 200 },
    riskyCount: { type: 'number', example: 70 },
    unknownCount: { type: 'number', example: 30 },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('bulk-verify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verify/bulk')
export class BulkVerifyController {
  constructor(private readonly bulkVerifyService: BulkVerifyService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload CSV/TXT file to start bulk verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or TXT file (max 50 MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File accepted — verification queued',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'leads-2024-q1.csv' },
        totalCount: { type: 'number', example: 5000 },
        duplicates: { type: 'number', example: 12 },
        detectedColumn: { type: 'string', example: 'email' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'File missing or unsupported format',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR ?? './uploads',
        filename: (_req, _file, cb) => cb(null, `${uuidv4()}.tmp`),
      }),
      limits: {
        fileSize:
          parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? '50', 10) *
          1024 *
          1024,
      },
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.csv', '.txt'].includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Only .csv and .txt files are allowed'), false);
        }
      },
    }),
  )
  upload(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    return this.bulkVerifyService.upload(user, file.path, file.originalname);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get the currently active (processing) bulk job, or null',
  })
  @ApiResponse({
    status: 200,
    description: 'Active job or null',
    schema: { oneOf: [JOB_SCHEMA, { type: 'null' }] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActive(@CurrentUser() user: User) {
    return this.bulkVerifyService.getActive(user.id);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all bulk jobs for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'all | pending | processing | completed | failed',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of bulk jobs',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: JOB_SCHEMA },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getJobs(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: string,
  ) {
    return this.bulkVerifyService.getJobs(user.id, page, limit, status);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Aggregate bulk verification stats for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk stats with period-over-period changes',
    schema: {
      type: 'object',
      properties: {
        totalJobs: { type: 'number', example: 8 },
        totalEmails: { type: 'number', example: 24000 },
        validRate: { type: 'number', example: 78.3 },
        avgJobDurationMs: { type: 'number', example: 45000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@CurrentUser() user: User) {
    return this.bulkVerifyService.getStats(user.id);
  }

  @Get(':jobId/progress')
  @ApiOperation({ summary: 'Poll real-time progress of a bulk job' })
  @ApiParam({ name: 'jobId', description: 'Email list UUID' })
  @ApiResponse({
    status: 200,
    description: 'Current processing progress',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', format: 'uuid' },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'completed', 'failed'],
        },
        totalCount: { type: 'number', example: 5000 },
        processedCount: { type: 'number', example: 1200 },
        percentage: { type: 'number', example: 24 },
        estimatedRemainingMs: { type: 'number', example: 60000 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProgress(@Param('jobId') jobId: string, @CurrentUser() user: User) {
    return this.bulkVerifyService.getProgress(jobId, user.id);
  }

  @Get('breakdown')
  @ApiOperation({
    summary: 'Aggregate breakdown across ALL bulk verifications for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated valid / invalid / risky / unknown counts',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 24000 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Valid' },
              value: { type: 'number', example: 18000 },
              percentage: { type: 'number', example: 75 },
              color: { type: 'string', example: '#22c55e' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAggregateBreakdown(@CurrentUser() user: User) {
    return this.bulkVerifyService.getAggregateBreakdown(user.id);
  }

  @Get(':jobId/breakdown')
  @ApiOperation({
    summary: 'Result breakdown (pie chart data) for a completed bulk job',
  })
  @ApiParam({ name: 'jobId', description: 'Email list UUID' })
  @ApiResponse({
    status: 200,
    description: 'Breakdown with counts and chart colours',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 5000 },
        breakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', example: 'Valid' },
              count: { type: 'number', example: 3900 },
              percentage: { type: 'number', example: 78 },
              color: { type: 'string', example: '#22c55e' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBreakdown(@Param('jobId') jobId: string, @CurrentUser() user: User) {
    return this.bulkVerifyService.getBreakdown(jobId, user.id);
  }

  @Get(':jobId/download')
  @ApiOperation({ summary: 'Stream bulk job results as CSV or JSON' })
  @ApiParam({ name: 'jobId', description: 'Email list UUID' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Default: csv',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['verified', 'full'],
    description:
      'verified = completed rows only; full = all rows. Default: full',
  })
  @ApiProduces('text/csv', 'application/json')
  @ApiResponse({
    status: 200,
    description: 'File stream — Content-Type matches format param',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async download(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Query('type') type: 'verified' | 'full' = 'full',
  ) {
    await this.bulkVerifyService.streamDownload(
      jobId,
      user.id,
      res,
      format,
      type,
    );
  }

  @Post(':jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-queue failed emails in a bulk job' })
  @ApiParam({ name: 'jobId', description: 'Email list UUID' })
  @ApiResponse({
    status: 200,
    description: 'Number of emails re-queued',
    schema: {
      type: 'object',
      properties: { requeued: { type: 'number', example: 17 } },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  retry(@Param('jobId') jobId: string, @CurrentUser() user: User) {
    return this.bulkVerifyService.retry(jobId, user.id);
  }
}
