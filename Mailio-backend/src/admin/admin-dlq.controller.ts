import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { DlqService } from '../dlq/dlq.service';
import { DlqStatus } from '../dlq/entities/dlq-job.entity';

@Controller('admin/dlq')
export class AdminDlqController {
  constructor(private readonly dlq: DlqService) {}

  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('sourceQueue') sourceQueue?: string,
    @Query('status') status?: DlqStatus,
    @Query('userId') userId?: string,
  ) {
    return this.dlq.list({ page, limit, sourceQueue, status, userId });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dlq.findOne(id);
  }

  @Post(':id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.dlq.retry(id);
  }

  @Delete(':id')
  async discard(@Param('id', ParseUUIDPipe) id: string) {
    return this.dlq.discard(id);
  }
}
