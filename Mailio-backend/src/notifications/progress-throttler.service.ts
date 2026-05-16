import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { EmailListStatus } from '../email-lists/entities/email-list.entity';
import { MetricsService } from '../metrics/metrics.service';
import { ProgressNotifier } from './progress-notifier';

interface Snapshot {
  processed: number;
  total: number;
  status: EmailListStatus;
}

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

  schedule(listId: string, snap: Snapshot): void {
    this.pending.set(listId, snap);
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flush(), this.intervalMs);
    }
  }

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
