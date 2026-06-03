import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { EnterpriseCreditsService } from './enterprise-credits.service';

const TICK_MS = 60 * 60 * 1000; // run every hour

@Injectable()
export class CreditExpiryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CreditExpiryService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly enterpriseCredits: EnterpriseCreditsService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    // Run once at startup so a restart doesn't delay expiry processing.
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
      await this.enterpriseCredits.processExpiredCredits();
    } catch (err) {
      this.logger.error(
        `Credit expiry tick failed: ${(err as Error).message}`,
      );
    }
  }
}
