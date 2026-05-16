import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CSV_PARSE_QUEUE } from '../csv-parse/csv-parse.types';
import { DB_WRITE_QUEUE } from '../db-write/db-write.types';
import { ApiKey } from '../providers/entities/api-key.entity';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
} from '../verification/verification.service';
import { MetricsCollectorService } from './metrics-collector.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey]),
    BullModule.registerQueue(
      { name: VERIFY_HIGH_QUEUE },
      { name: VERIFY_BULK_QUEUE },
      { name: DB_WRITE_QUEUE },
      { name: CSV_PARSE_QUEUE },
    ),
  ],
  providers: [MetricsCollectorService],
})
export class MetricsCollectorModule {}
