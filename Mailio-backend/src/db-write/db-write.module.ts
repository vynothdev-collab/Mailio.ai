import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailListsModule } from '../email-lists/email-lists.module';
import { EmailsModule } from '../emails/emails.module';
import { VerificationModule } from '../verification/verification.module';
import { DbWriteProcessor } from './db-write.processor';
import { DbWriteService } from './db-write.service';
import { DB_WRITE_QUEUE } from './db-write.types';

/**
 * Producer + consumer for the db.write queue.
 *
 * Producer (DbWriteService) is exported so the verification processor can
 * enqueue. Consumer (DbWriteProcessor) is registered as a provider so it
 * binds automatically whenever this module is loaded.
 *
 * Loading this in the API module wires the producer only (controllers can
 * push results directly if they ever need to bypass verification); loading
 * it in the worker module wires both producer and consumer.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: DB_WRITE_QUEUE,
      defaultJobOptions: {
        attempts: parseInt(process.env.DB_WRITE_MAX_RETRIES ?? '10', 10),
        backoff: {
          type: 'exponential',
          delay: parseInt(
            process.env.DB_WRITE_BACKOFF_DELAY_MS ?? '2000',
            10,
          ),
        },
        // Long retention on failure so an operator can inspect what
        // payload couldn't be written.
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 7 * 86400 },
      },
    }),
    EmailsModule,
    EmailListsModule,
    VerificationModule,
  ],
  providers: [DbWriteService, DbWriteProcessor],
  exports: [DbWriteService],
})
export class DbWriteModule {}
