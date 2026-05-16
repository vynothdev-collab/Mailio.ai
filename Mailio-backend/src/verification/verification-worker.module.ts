import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { DbWriteModule } from '../db-write/db-write.module';
import { EmailListsModule } from '../email-lists/email-lists.module';
import { EmailsModule } from '../emails/emails.module';
import { MailTesterModule } from '../mailtester/mailtester.module';
import { StarvationGuard } from './starvation-guard.service';
import { VerificationBulkProcessor } from './verification-bulk.processor';
import { VerificationHighProcessor } from './verification-high.processor';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
  VerificationService,
} from './verification.service';

/**
 * Hosts the two @Processor classes. Loaded by worker processes (and the
 * monolith bootstrap for backward compat). The two consumers share the
 * VerificationBaseProcessor implementation so their behavior is
 * identical — only the bound queue and concurrency differ.
 *
 * Total throughput is capped globally by the KeyPool, so per-queue
 * concurrency tunes *fairness*, not RPS. A typical setup runs verify.high
 * with concurrency=4 and verify.bulk with concurrency=12.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: VERIFY_HIGH_QUEUE },
      { name: VERIFY_BULK_QUEUE },
    ),
    forwardRef(() => EmailsModule),
    forwardRef(() => EmailListsModule),
    MailTesterModule,
    DbWriteModule,
  ],
  providers: [
    VerificationService,
    VerificationHighProcessor,
    VerificationBulkProcessor,
    StarvationGuard,
  ],
  exports: [VerificationService],
})
export class VerificationWorkerModule {}
