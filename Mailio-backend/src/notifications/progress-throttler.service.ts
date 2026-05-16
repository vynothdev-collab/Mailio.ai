import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { EmailListStatus } from '../email-lists/entities/email-list.entity';
import { MetricsService } from '../metrics/metrics.service';
import { ProgressNotifier } from './progress-notifier';

interface Snapshot {
  processed: number;
  total: number;
  status: EmailListStatus;
}

/**
 * Coalesces verification:progress emissions to at most one per list per
 * flush interval (default 1 s). The batch pipeline can complete tens of
 * thousands of emails per second; without this throttle a single upload
 * would push that many events through socket.io to every subscriber on
 * the `list:{listId}` room — pure waste, since the UI only paints at
 * frame rate.
 *
 * Semantics:
 *   - Last-write-wins per listId. A faster snapshot supersedes an older
 *     one in the pending map before the next flush fires.
 *   - The terminal (processed >= total) snapshot is always emitted, and
 *     also triggers a `list:status-change` event exactly once per list.
 *   - flush() is idempotent. onModuleDestroy() forces a final flush so
 *     the last state is delivered even if the process is shutting down.
 *
 * This service is NOT a buffer for failure events — those are infrequent
 * enough to be emitted directly by the DbWriteProcessor.
 */
@Injectable()
export class ProgressThrottlerService implements OnModuleDestroy {
  private readonly pending = new Map<string, Snapshot>();
  private readonly statusEmitted = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number = parseInt(
    process.env.PROGRESS_FLUSH_INTERVAL_MS ?? '1000',
    10,
  );

  constructor(
    private readonly notifier: ProgressNotifier,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  /**
   * Record the latest snapshot for a list. Schedules the next flush if
   * one isn't already pending. Safe to call from any number of
   * concurrent DB-write handlers — Node's single-threaded event loop
   * serialises the Map writes.
   */
  schedule(listId: string, snap: Snapshot): void {
    this.pending.set(listId, snap);
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flush(), this.intervalMs);
    }
  }

  /**
   * Emit every pending snapshot and clear the buffer. Public so the
   * shutdown hook (and tests) can force-drain.
   */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.size === 0) return;

    for (const [listId, s] of this.pending) {
      const pct = s.total > 0 ? Math.round((s.processed / s.total) * 100) : 0;
      this.notifier.emitProgress(listId, {
        listId,
        processed: s.processed,
        total: s.total,
        pct,
      });
      this.metrics?.wsEmits?.labels({ kind: 'progress' }).inc();

      if (s.processed >= s.total && !this.statusEmitted.has(listId)) {
        this.notifier.emitListStatusChange(listId, s.status);
        this.statusEmitted.add(listId);
        this.metrics?.wsEmits?.labels({ kind: 'status-change' }).inc();
      }
    }
    this.pending.clear();
  }

  onModuleDestroy(): void {
    this.flush();
  }
}
