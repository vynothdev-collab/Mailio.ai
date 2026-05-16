import { DynamicModule, Module } from '@nestjs/common';
import { VerificationGatewayModule } from '../verification/verification-gateway.module';
import { DirectProgressNotifier } from './direct-progress-notifier';
import { ProgressNotifier } from './progress-notifier';
import { ProgressThrottlerService } from './progress-throttler.service';
import { RedisProgressPublisher } from './redis-progress-publisher';
import { RedisProgressSubscriber } from './redis-progress-subscriber';

/**
 * Provides the ProgressNotifier token wired to the right transport for the
 * current process role:
 *
 *   - 'direct'     — same process as the gateway (monolith). Synchronous,
 *                    no Redis hop.
 *   - 'publisher'  — worker process. Publishes to Redis pub/sub.
 *   - 'subscriber' — API process. Provides DirectProgressNotifier (in case
 *                    anything else in-process wants to emit) AND runs the
 *                    bridge that re-emits worker events to socket.io.
 */
@Module({})
export class NotificationsModule {
  static forRole(role: 'direct' | 'publisher' | 'subscriber'): DynamicModule {
    if (role === 'publisher') {
      // Worker process: emits go through Redis pub/sub. The throttler
      // wraps the publisher so worker-side coalescing keeps Redis chatter
      // bounded — the API process then forwards the (already-throttled)
      // events to socket.io.
      return {
        module: NotificationsModule,
        global: true,
        providers: [
          { provide: ProgressNotifier, useClass: RedisProgressPublisher },
          ProgressThrottlerService,
        ],
        exports: [ProgressNotifier, ProgressThrottlerService],
      };
    }

    // 'direct' and 'subscriber' both need the gateway in-process.
    const providers = [
      DirectProgressNotifier,
      { provide: ProgressNotifier, useExisting: DirectProgressNotifier },
      ProgressThrottlerService,
    ];

    if (role === 'subscriber') {
      providers.push(RedisProgressSubscriber as any);
    }

    return {
      module: NotificationsModule,
      global: true,
      imports: [VerificationGatewayModule],
      providers,
      exports: [ProgressNotifier, ProgressThrottlerService],
    };
  }
}
