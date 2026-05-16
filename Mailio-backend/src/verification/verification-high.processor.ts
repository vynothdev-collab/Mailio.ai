import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { WorkerOptions } from 'bullmq';
import { VerificationBaseProcessor } from './verification-base.processor';
import { VERIFY_HIGH_QUEUE } from './verification.service';

@Injectable()
@Processor(VERIFY_HIGH_QUEUE, {
  concurrency: parseInt(process.env.VERIFY_HIGH_CONCURRENCY ?? '4', 10),
} satisfies Pick<WorkerOptions, 'concurrency'> & Record<string, unknown>)
export class VerificationHighProcessor extends VerificationBaseProcessor {
  protected sourceQueueName(): string {
    return VERIFY_HIGH_QUEUE;
  }
}
