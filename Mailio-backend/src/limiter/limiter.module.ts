import { Global, Module } from '@nestjs/common';
import { RedisRateLimiter } from './redis-rate-limiter.service';

/**
 * Global module: any module that wants to throttle a downstream call can
 * inject RedisRateLimiter without re-importing this module.
 */
@Global()
@Module({
  providers: [RedisRateLimiter],
  exports: [RedisRateLimiter],
})
export class LimiterModule {}
