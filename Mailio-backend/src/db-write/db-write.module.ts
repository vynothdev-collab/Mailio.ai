import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { EmailListsModule } from '../email-lists/email-lists.module';
import { EmailsModule } from '../emails/emails.module';
import { VerificationModule } from '../verification/verification.module';
import { DbWriteProcessor } from './db-write.processor';
import { DbWriteService } from './db-write.service';
import { DB_WRITE_QUEUE } from './db-write.types';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DB_WRITE_QUEUE,
      defaultJobOptions: {
        attempts: parseInt(process.env.DB_WRITE_MAX_RETRIES ?? '10', 10),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.DB_WRITE_BACKOFF_DELAY_MS ?? '2000', 10),
        },
        removeOnComplete: { age: 3600, count: 5000 },
        removeOnFail: { age: 7 * 86400 },
      },
    }),
    EmailsModule,
    EmailListsModule,
    VerificationModule,
    CreditsModule,
  ],
  providers: [DbWriteService, DbWriteProcessor],
  exports: [DbWriteService],
})
export class DbWriteModule {}
