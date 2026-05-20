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
