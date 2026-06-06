import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EnterpriseCreditsService } from './enterprise-credits.service';

const TICK_MS = 5 * 60 * 1000;

@Injectable()
export class CreditExpiryService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CreditExpiryService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly enterpriseCredits: EnterpriseCreditsService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.subscriptions.expireAndActivateSubscriptions();
    } catch (err) {
      this.logger.error(
        `Subscription expiry tick failed: ${(err as Error).message}`,
      );
    }

    try {
      await this.enterpriseCredits.processExpiredCredits();
    } catch (err) {
      this.logger.error(
        `Legacy enterprise expiry tick failed: ${(err as Error).message}`,
      );
    }
  }
}
