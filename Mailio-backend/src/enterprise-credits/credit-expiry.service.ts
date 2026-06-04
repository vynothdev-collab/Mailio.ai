import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EnterpriseCreditsService } from './enterprise-credits.service';

const TICK_MS = 5 * 60 * 1000; // run every 5 minutes

/**
 * Credit expiry scheduler.
 *
 * Order matters:
 *   1. Run subscription expiry FIRST so EXPIRED rows are flagged and any
 *      QUEUED plan becomes ACTIVE.
 *   2. Then run the legacy enterprise cycle reset for any enterprises whose
 *      `credit_expires_at` is still in the past WITHOUT a queued plan
 *      (handles records that pre-date the subscription system).
 */
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
      // Legacy fallback for enterprises that pre-date the subscription system.
      await this.enterpriseCredits.processExpiredCredits();
    } catch (err) {
      this.logger.error(
        `Legacy enterprise expiry tick failed: ${(err as Error).message}`,
      );
    }
  }
}
