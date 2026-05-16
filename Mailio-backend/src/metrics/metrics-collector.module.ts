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

/**
 * Opt-in collector that polls queue counts and key-pool status into
 * gauges. Separate from MetricsModule so processes that don't need this
 * (e.g. a future stripped-down container) can skip the periodic timer
 * without losing the call-site instrumentation.
 *
 * Imported by ApiAppModule and WorkerAppModule — both processes have a
 * Redis connection and DB connection, so either can serve /metrics with
 * accurate gauges.
 */
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
