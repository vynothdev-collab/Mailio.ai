import { DynamicModule, Module } from '@nestjs/common';
import { VerificationGatewayModule } from '../verification/verification-gateway.module';
import { DirectProgressNotifier } from './direct-progress-notifier';
import { ProgressNotifier } from './progress-notifier';
import { ProgressThrottlerService } from './progress-throttler.service';
import { RedisProgressPublisher } from './redis-progress-publisher';
import { RedisProgressSubscriber } from './redis-progress-subscriber';

@Module({})
export class NotificationsModule {
  static forRole(role: 'direct' | 'publisher' | 'subscriber'): DynamicModule {
    if (role === 'publisher') {
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
