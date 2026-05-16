import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VerificationResult } from '../common/types/verification-result.enum';
import { User } from '../users/entities/user.entity';
import { VerificationService } from '../verification/verification.service';
import { CreateEmailListDto } from './dto/create-email-list.dto';
import { EmailListsService } from './email-lists.service';

const LIST_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'leads-q1.csv' },
    status: {
      type: 'string',
      enum: ['pending', 'processing', 'completed', 'failed'],
    },
    totalCount: { type: 'number', example: 5000 },
    processedCount: { type: 'number', example: 5000 },
    validCount: { type: 'number', example: 3900 },
    invalidCount: { type: 'number', example: 700 },
    riskyCount: { type: 'number', example: 280 },
    unknownCount: { type: 'number', example: 120 },
    disposableCount: { type: 'number', example: 45 },
    originalFilename: { type: 'string', example: 'leads-q1.csv' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('email-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-lists')
export class EmailListsController {
  constructor(
    private readonly emailListsService: EmailListsService,
    private readonly verificationService: VerificationService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Upload CSV/TXT to create a bulk verification list',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file'],
      properties: {
        name: {
          type: 'string',
          description: 'Human-readable list name',
          example: 'Q1 Leads',
        },
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
    description: 'List created and verification queued',
    schema: {
      type: 'object',
      properties: {
        listId: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Q1 Leads' },
        totalCount: { type: 'number', example: 5000 },
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
  async create(
    @Body() dto: CreateEmailListDto,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { list, emailIds } = await this.emailListsService.createFromFile(
      user.id,
      dto.name,
      file.path,
      file.originalname,
    );

    if (process.env.BULK_BATCH_ENABLED === 'true') {
      await this.verificationService.enqueueBulkBatches(
        emailIds,
        user.id,
        list.id,
      );
    } else {
      await this.verificationService.enqueueBulk(emailIds, user.id, list.id);
    }

    return { listId: list.id, name: list.name, totalCount: list.totalCount };
  }

  @Get()
  @ApiOperation({ summary: 'List all email lists for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated email lists',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: LIST_SCHEMA },
        total: { type: 'number', example: 12 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const [items, total] = await this.emailListsService.findByUser(
      user.id,
      page,
      limit,
    );
    return { items, total, page, limit };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific email list by ID' })
  @ApiParam({ name: 'id', description: 'Email list UUID' })
  @ApiResponse({
    status: 200,
    description: 'Email list details',
    schema: LIST_SCHEMA,
  })
  @ApiResponse({ status: 404, description: 'List not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.emailListsService.findById(id, user.id);
  }

  @Get(':id/emails')
  @ApiOperation({
    summary: 'Get emails in a list — paginated, filterable by result',
  })
  @ApiParam({ name: 'id', description: 'Email list UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'result',
    required: false,
    enum: VerificationResult,
    description: 'Filter by verification result',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated emails in the list',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              address: { type: 'string', format: 'email' },
              verificationResult: {
                type: 'string',
                enum: ['VALID', 'INVALID', 'RISKY', 'UNKNOWN'],
              },
              score: { type: 'number', example: 88 },
              processedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 5000 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'List not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEmails(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('result') result?: VerificationResult,
  ) {
    const [items, total] = await this.emailListsService.findEmailsInList(
      id,
      user.id,
      page,
      limit,
      result,
    );
    return { items, total, page, limit };
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Stream list results as CSV' })
  @ApiParam({ name: 'id', description: 'Email list UUID' })
  @ApiQuery({
    name: 'result',
    required: false,
    enum: VerificationResult,
    description: 'Filter to a single result type',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Streaming CSV attachment' })
  @ApiResponse({ status: 404, description: 'List not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCsv(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query('result') result?: VerificationResult,
  ) {
    await this.emailListsService.streamDownload(
      id,
      user.id,
      res,
      'csv',
      result === undefined ? 'full' : 'verified',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a list and all its emails' })
  @ApiParam({ name: 'id', description: 'Email list UUID' })
  @ApiResponse({ status: 200, description: 'List deleted' })
  @ApiResponse({ status: 404, description: 'List not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.emailListsService.remove(id, user.id);
  }
}
