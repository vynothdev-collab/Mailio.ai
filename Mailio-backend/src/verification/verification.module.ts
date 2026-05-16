import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
  VerificationService,
} from './verification.service';

/**
 * Producer-side module: exposes VerificationService so controllers can
 * enqueue verify jobs onto either queue. Registers both verify.high and
 * verify.bulk so @InjectQueue resolves in any process that loads this
 * module. Workers additionally load VerificationWorkerModule which binds
 * the two consumers.
 */
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
