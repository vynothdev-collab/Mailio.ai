import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { VerificationService } from '../verification/verification.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailsService } from './emails.service';

@ApiTags('emails')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emails')
export class EmailsController {
  constructor(
    private readonly emailsService: EmailsService,
    private readonly verificationService: VerificationService,
  ) {}

  @Post('verify')
  @ApiOperation({ summary: 'Queue a single email for verification (priority 1)' })
  async verify(@Body() dto: VerifyEmailDto, @CurrentUser() user: User) {
    const email = await this.emailsService.createSingle(dto.email, user.id);
    await this.verificationService.enqueueSingle(email.id, user.id);
    return { emailId: email.id, status: email.status };
  }

  @Get('single')
  @ApiOperation({ summary: 'List single verification history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listSingles(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const [items, total] = await this.emailsService.findSinglesByUser(
      user.id,
      page,
      limit,
    );
    return { items, total, page, limit };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single verification result by ID' })
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.emailsService.findById(id, user.id);
  }
}
