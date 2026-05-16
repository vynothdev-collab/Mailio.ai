import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { WorkerOptions } from 'bullmq';
import { VerificationBaseProcessor } from './verification-base.processor';
import { VERIFY_HIGH_QUEUE } from './verification.service';

/**
 * Consumes verify.high — single-email user-facing verifications. Concurrency
 * is intentionally small: single verifies are rare and we'd rather have
 * spare slots ready than have them stuck behind bulk. Total RPS is still
 * capped by KeyPool, so giving high a few slots doesn't reduce overall
 * throughput, just biases which jobs win when budget is tight.
 *
 * Tune via VERIFY_HIGH_CONCURRENCY env var; default 4.
 */
@Injectable()
@Processor(VERIFY_HIGH_QUEUE, {
  concurrency: parseInt(process.env.VERIFY_HIGH_CONCURRENCY ?? '4', 10),
} satisfies Pick<WorkerOptions, 'concurrency'> & Record<string, unknown>)
export class VerificationHighProcessor extends VerificationBaseProcessor {
  protected sourceQueueName(): string {
    return VERIFY_HIGH_QUEUE;
  }
}
