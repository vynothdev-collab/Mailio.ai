import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ResultsService } from './results.service';
import type { ResultStatus, ResultType } from './results.service';

@ApiTags('results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Unified results: paginated rows + aggregate stats in one round-trip',
  })
  @ApiQuery({ name: 'page',   required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit',  required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'type',   required: false, enum: ['all', 'single', 'bulk'] })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'valid', 'invalid', 'risky'] })
  @ApiQuery({ name: 'query',  required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Results payload',
    schema: {
      type: 'object',
      properties: {
        data:  { type: 'array' },
        total: { type: 'number' },
        page:  { type: 'number' },
        limit: { type: 'number' },
        stats: {
          type: 'object',
          properties: {
            total:   { type: 'number' },
            valid:   { type: 'number' },
            invalid: { type: 'number' },
            risky:   { type: 'number' },
          },
        },
      },
    },
  })
  getResults(
    @CurrentUser() user: User,
    @Query('page',  new ParseIntPipe({ optional: true })) page  = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('type')   type:   ResultType   = 'all',
    @Query('status') status: ResultStatus = 'all',
    @Query('query')  query?: string,
  ) {
    return this.resultsService.getResults(user.id, page, limit, type, status, query);
  }
}
