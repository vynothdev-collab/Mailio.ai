import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { TicketStatus, TicketType } from './entities/ticket.entity';
import { SupportTicketsService } from './support-tickets.service';

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class SupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket (optionally with attachments)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FilesInterceptor('attachments', MAX_FILES, {
      storage: memoryStorage(),
      // Per-file cap matches the overall request cap; the service then
      // enforces the *combined* 5 MB rule on top.
      limits: { fileSize: MAX_TOTAL_BYTES, files: MAX_FILES },
      fileFilter: (_req, file, cb) => {
        if (!ATTACHMENT_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `File type not allowed: ${file.originalname} (${file.mimetype}).`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() attachments: Express.Multer.File[] = [],
  ) {
    const ticket = await this.service.createTicket(user, dto, attachments);
    return this.service.getTicketForUser(user, ticket.id);
  }

  @Get('my')
  @ApiOperation({
    summary: 'List tickets created by the logged-in user (paginated)',
  })
  listMine(
    @CurrentUser() user: User,
    @Query('status') status?: TicketStatus,
    @Query('type') type?: TicketType,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listMyTickets(user, {
      status,
      type,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket + its message thread + attachments' })
  getOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTicketForUser(user, id);
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reply to a ticket as the owner or enterprise admin',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FilesInterceptor('attachments', MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_TOTAL_BYTES, files: MAX_FILES },
      fileFilter: (_req, file, cb) => {
        if (!ATTACHMENT_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `File type not allowed: ${file.originalname} (${file.mimetype}).`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  reply(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
    @UploadedFiles() attachments: Express.Multer.File[] = [],
  ) {
    return this.service.replyAsUser(user, id, dto, attachments);
  }

  @Delete(':ticketId/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an attachment the caller uploaded' })
  deleteAttachment(
    @CurrentUser() user: User,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.service.deleteAttachmentForUser(user, ticketId, attachmentId);
  }
}
