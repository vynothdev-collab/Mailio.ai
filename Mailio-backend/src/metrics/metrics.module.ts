import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * @Global so every processor / service can inject MetricsService without
 * a per-module import. There is intentionally no controller here — the
 * /metrics endpoint is mounted only by processes that should expose it
 * (the API process via AdminModule; the worker process via a tiny
 * dedicated http server, when needed).
 */
@Global()
@Module({
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
