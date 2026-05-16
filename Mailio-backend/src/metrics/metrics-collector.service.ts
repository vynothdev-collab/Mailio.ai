import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { CSV_PARSE_QUEUE } from '../csv-parse/csv-parse.types';
import { DB_WRITE_QUEUE } from '../db-write/db-write.types';
import { ApiKey, ApiKeyStatus } from '../providers/entities/api-key.entity';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
} from '../verification/verification.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsCollectorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MetricsCollectorService.name);
  private timer?: NodeJS.Timeout;
  private readonly TICK_MS = parseInt(
    process.env.METRICS_COLLECT_MS ?? '15000',
    10,
  );
  private readonly queues: { name: string; queue: Queue }[];

  constructor(
    private readonly metrics: MetricsService,
    @InjectQueue(VERIFY_HIGH_QUEUE) high: Queue,
    @InjectQueue(VERIFY_BULK_QUEUE) bulk: Queue,
    @InjectQueue(DB_WRITE_QUEUE) dbWrite: Queue,
    @InjectQueue(CSV_PARSE_QUEUE) csvParse: Queue,
    @InjectRepository(ApiKey)
    private readonly keysRepo: Repository<ApiKey>,
  ) {
    this.queues = [
      { name: VERIFY_HIGH_QUEUE, queue: high },
      { name: VERIFY_BULK_QUEUE, queue: bulk },
      { name: DB_WRITE_QUEUE, queue: dbWrite },
      { name: CSV_PARSE_QUEUE, queue: csvParse },
    ];
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), this.TICK_MS);
    // Kick once at boot so the first scrape isn't all zeros.
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    try {
      await Promise.all([this.collectQueues(), this.collectKeyPool()]);
    } catch (e) {
      this.logger.warn(`metrics tick failed: ${(e as Error).message}`);
    }
  }

  private async collectQueues(): Promise<void> {
    for (const { name, queue } of this.queues) {
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
        'paused',
      );
      for (const [state, count] of Object.entries(counts)) {
        this.metrics.queueJobs.labels({ queue: name, state }).set(count);
      }

      const waiting = await queue.getWaiting(0, 0);
      const head = waiting[0];
      const lagSec = head ? (Date.now() - head.timestamp) / 1000 : 0;
      this.metrics.queueLagSeconds.labels({ queue: name }).set(lagSec);
    }
  }

  private async collectKeyPool(): Promise<void> {
    const rows = await this.keysRepo
      .createQueryBuilder('k')
      .select('k.provider', 'provider')
      .addSelect('k.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('k.provider')
      .addGroupBy('k.status')
      .getRawMany<{ provider: string; status: ApiKeyStatus; count: string }>();

    for (const status of Object.values(ApiKeyStatus)) {
      const seenProviders = new Set(rows.map((r) => r.provider));
      for (const provider of seenProviders) {
        this.metrics.keyPoolStatus.labels({ provider, status }).set(0);
      }
    }
    for (const r of rows) {
      this.metrics.keyPoolStatus
        .labels({ provider: r.provider, status: r.status })
        .set(parseInt(r.count, 10));
    }
  }
}
