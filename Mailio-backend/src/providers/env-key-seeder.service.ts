import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailTesterService } from '../mailtester/mailtester.service';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { KeyPoolSync } from './key-pool.sync';

/**
 * Backward-compat bootstrap: if the api_keys table is empty for a given
 * provider and the legacy env credential exists, insert it so the system
 * keeps working through the Phase 3 cutover without operator action.
 *
 * Idempotent — only inserts when the provider has zero rows of any
 * status, so subsequent boots don't recreate keys that were intentionally
 * deleted via the admin API.
 */
@Injectable()
export class EnvKeySeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EnvKeySeederService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly mailtester: MailTesterService,
    private readonly sync: KeyPoolSync,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const fallback = this.mailtester.getFallbackKey();
      if (!fallback) return;

      const existing = await this.repo.count({
        where: { provider: this.mailtester.name },
      });
      if (existing > 0) return;

      const rlMax = parseInt(process.env.MAILTESTER_RATE_LIMIT ?? '57', 10);
      const rlWindowMs = parseInt(
        process.env.MAILTESTER_RATE_WINDOW_MS ?? '10000',
        10,
      );

      const row = this.repo.create({
        provider: this.mailtester.name,
        label: 'seeded-from-env',
        keyValue: fallback,
        status: ApiKeyStatus.ACTIVE,
        weight: 1,
        rlMax,
        rlWindowMs,
      });
      const saved = await this.repo.save(row);

      this.logger.log(
        `Seeded MailTester key from env (id=${saved.id}, max=${rlMax}/${rlWindowMs}ms)`,
      );
      await this.sync.reloadAll();
      await this.sync.publish({ type: 'added', keyId: saved.id });
    } catch (e) {
      this.logger.error(`seed failed: ${(e as Error).message}`);
    }
  }
}
