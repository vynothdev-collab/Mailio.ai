import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
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
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
