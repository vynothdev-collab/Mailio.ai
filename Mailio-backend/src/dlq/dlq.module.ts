import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CSV_PARSE_QUEUE } from '../csv-parse/csv-parse.types';
import { DB_WRITE_QUEUE } from '../db-write/db-write.types';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
} from '../verification/verification.service';
import { DlqService } from './dlq.service';
import { DlqJob } from './entities/dlq-job.entity';

/**
 * Global because every processor's onFailed handler may want to push to
 * DLQ regardless of which module hosts the processor. Importing globally
 * costs ~nothing (no controllers, one service) and saves wiring DlqModule
 * into half a dozen places.
 *
 * Registers the four producer queues we know how to retry into. New
 * queues need a new @InjectQueue line in DlqService.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([DlqJob]),
    BullModule.registerQueue(
      { name: VERIFY_HIGH_QUEUE },
      { name: VERIFY_BULK_QUEUE },
      { name: DB_WRITE_QUEUE },
      { name: CSV_PARSE_QUEUE },
    ),
  ],
  providers: [DlqService],
  exports: [DlqService],
})
export class DlqModule {}
