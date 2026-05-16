import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { EmailVerificationJobPayload } from './dto/job-payload.dto';
import {
  BULK_BASE_PRIORITY,
  VERIFY_BULK_QUEUE,
  VerificationService,
} from './verification.service';

/**
 * Aging promoter for the verify.bulk queue.
 *
 * The bulk priority scheme (verification.service.ts) anchors every new
 * upload at the current now-serving cursor, so concurrent uploads
 * interleave fairly. But a list whose jobs were enqueued long ago can
 * still get stuck behind newer traffic if the cursor advanced past their
 * priority band slowly — e.g. a small list enqueued during a brief lull
 * sits behind a much larger upload that arrived seconds later with
 * adjacent priorities.
 *
 * This guard scans the waiting set every 30s, groups jobs by listId,
 * and re-anchors any list whose oldest waiting job is > 3 minutes old
 * back onto the *current* now-serving cursor. We never demote: if a
 * job's priority is already lower (= higher BullMQ priority) than the
 * recomputed value, we leave it untouched.
 */
@Injectable()
export class StarvationGuard
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StarvationGuard.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  // Aggressive defaults: when uploads arrive faster than verifications
  // complete, the nowServing cursor doesn't advance between parses, so
  // every fresh upload captures the SAME base priority. BullMQ then
  // breaks the tie by FIFO — the user sees the newest list stuck at
  // 0/0/0 in the UI while the queue chews through older identical-
  // priority lists in upload order. A 15s threshold + 5s scan brings
  // the re-anchor into the user's visible feedback window, restoring
  // the "all my uploads are progressing together" UX without changing
  // the cursor algebra itself.
  //
  // Override per environment via STARVATION_SCAN_INTERVAL_MS /
  // STARVATION_THRESHOLD_MS — set the threshold higher on quiet
  // long-batch deployments where shuffling priorities every 15s
  // would just churn Redis.
  private readonly SCAN_INTERVAL_MS = parseInt(
    process.env.STARVATION_SCAN_INTERVAL_MS ?? '5000',
    10,
  );
  private readonly STARVATION_THRESHOLD_MS = parseInt(
    process.env.STARVATION_THRESHOLD_MS ?? '15000',
    10,
  );

  constructor(
    @InjectQueue(VERIFY_BULK_QUEUE)
    private readonly bulkQueue: Queue<EmailVerificationJobPayload>,
    private readonly verificationService: VerificationService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      void this.scan();
    }, this.SCAN_INTERVAL_MS);
    // Don't keep the event loop alive solely for this guard.
    this.timer.unref?.();
    this.logger.log(
      `Starvation guard armed (scan=${this.SCAN_INTERVAL_MS}ms, threshold=${this.STARVATION_THRESHOLD_MS}ms)`,
    );
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async scan(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const waiting = await this.bulkQueue.getWaiting(0, -1);
      if (waiting.length === 0) return;

      const byList = new Map<string, Job<EmailVerificationJobPayload>[]>();
      for (const job of waiting) {
        const listId = job.data?.listId;
        if (!listId) continue;
        let arr = byList.get(listId);
        if (!arr) {
          arr = [];
          byList.set(listId, arr);
        }
        arr.push(job);
      }
      if (byList.size === 0) return;

      const now = Date.now();
      const starved: {
        listId: string;
        oldest: number;
        jobs: Job<EmailVerificationJobPayload>[];
      }[] = [];

      for (const [listId, jobs] of byList) {
        let oldest = Number.POSITIVE_INFINITY;
        for (const j of jobs) {
          if (j.timestamp < oldest) oldest = j.timestamp;
        }
        if (now - oldest > this.STARVATION_THRESHOLD_MS) {
          jobs.sort((a, b) => a.timestamp - b.timestamp);
          starved.push({ listId, oldest, jobs });
        }
      }
      if (starved.length === 0) return;

      // Most-starved list first → gets the lowest (= best) priority band.
      starved.sort((a, b) => a.oldest - b.oldest);

      const base = await this.verificationService.getNowServing();
      let offset = 0;
      let promoted = 0;

      for (const { listId, jobs } of starved) {
        let promotedInList = 0;
        for (const job of jobs) {
          const newPriority = BULK_BASE_PRIORITY + base + offset;
          offset++;
          const current = job.opts.priority ?? Number.MAX_SAFE_INTEGER;
          if (newPriority < current) {
            try {
              await job.changePriority({ priority: newPriority });
              promotedInList++;
            } catch (err) {
              // Job may have transitioned out of 'waiting' between fetch
              // and update — that's fine, just skip it.
              this.logger.debug(
                `changePriority skipped for job ${job.id}: ${(err as Error).message}`,
              );
            }
          }
        }
        if (promotedInList > 0) {
          promoted += promotedInList;
          this.logger.log(
            `Promoted ${promotedInList} starved job(s) for listId=${listId} (waited ${Math.round(
              (now - jobs[0].timestamp) / 1000,
            )}s)`,
          );
        }
      }
      if (promoted === 0) {
        this.logger.debug(
          `Scan found ${starved.length} aged list(s) but no priority change was beneficial`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Starvation guard scan failed: ${(err as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }
}
