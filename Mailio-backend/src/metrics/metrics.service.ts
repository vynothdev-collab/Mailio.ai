import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly queueJobs = new Gauge({
    name: 'mailio_queue_jobs',
    help: 'BullMQ job counts by queue and state',
    labelNames: ['queue', 'state'] as const,
    registers: [this.registry],
  });
  readonly queueLagSeconds = new Gauge({
    name: 'mailio_queue_lag_seconds',
    help: 'Age (in seconds) of the oldest waiting job per queue',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  readonly providerRequests = new Counter({
    name: 'mailio_provider_request_total',
    help: 'External provider verification requests',
    labelNames: ['provider', 'key_id', 'outcome'] as const,
    registers: [this.registry],
  });
  readonly providerDuration = new Histogram({
    name: 'mailio_provider_duration_seconds',
    help: 'Provider call latency in seconds',
    labelNames: ['provider', 'outcome'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
    registers: [this.registry],
  });

  readonly limiterAcquires = new Counter({
    name: 'mailio_limiter_acquire_total',
    help: 'Token-bucket acquire attempts by key and outcome',
    labelNames: ['key', 'granted'] as const,
    registers: [this.registry],
  });
  readonly limiterRetryAfter = new Histogram({
    name: 'mailio_limiter_retry_after_ms',
    help: 'retryAfter milliseconds returned on denied acquires',
    labelNames: ['key'] as const,
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    registers: [this.registry],
  });

  readonly keyPoolStatus = new Gauge({
    name: 'mailio_key_pool_keys',
    help: 'Number of keys in each status per provider',
    labelNames: ['provider', 'status'] as const,
    registers: [this.registry],
  });

  readonly dbWriteDuration = new Histogram({
    name: 'mailio_db_write_duration_seconds',
    help: 'Time spent in DbWriteProcessor handlers',
    labelNames: ['kind', 'outcome'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [this.registry],
  });

  readonly dlqEntries = new Counter({
    name: 'mailio_dlq_entries_total',
    help: 'Terminal failures landed in the DLQ',
    labelNames: ['source_queue'] as const,
    registers: [this.registry],
  });

  readonly batchSize = new Histogram({
    name: 'mailio_verify_batch_size',
    help: 'Emails actually claimed and processed per verify.batch job',
    labelNames: ['outcome'] as const,
    buckets: [1, 5, 10, 25, 50, 75, 100],
    registers: [this.registry],
  });
  readonly batchDuration = new Histogram({
    name: 'mailio_verify_batch_duration_seconds',
    help: 'Wall-clock duration of a verify.batch job',
    labelNames: ['outcome'] as const,
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
    registers: [this.registry],
  });
  readonly batchPartialFailures = new Counter({
    name: 'mailio_verify_batch_partial_failures_total',
    help: 'Emails that failed inside a batch (by reason)',
    labelNames: ['reason'] as const,
    registers: [this.registry],
  });

  readonly wsEmits = new Counter({
    name: 'mailio_ws_progress_emits_total',
    help: 'WebSocket progress emits actually flushed (post-throttle)',
    labelNames: ['kind'] as const,
    registers: [this.registry],
  });

  onModuleInit(): void {
    // Default node/process/heap metrics. Cheap, useful for capacity work.
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'mailio_node_',
    });
  }

  /** Used by the /metrics controller; returns the Prometheus text format. */
  async render(): Promise<string> {
    return this.registry.metrics();
  }

  /** Content-type the /metrics endpoint should advertise. */
  get contentType(): string {
    return this.registry.contentType;
  }
}
