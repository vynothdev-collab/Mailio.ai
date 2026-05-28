import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailTesterService } from '../mailtester/mailtester.service';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { KeyPoolSync } from './key-pool.sync';

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

      const rlMax = parseInt(process.env.MAILTESTER_RATE_LIMIT ?? '228', 10);
      const rlWindowMs = parseInt(
        process.env.MAILTESTER_RATE_WINDOW_MS ?? '10000',
        10,
      );

      const existingRows = await this.repo.find({
        where: { provider: this.mailtester.name },
      });

      if (existingRows.length === 0) {
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
        return;
      }

      const stale = existingRows.filter(
        (r) => r.rlMax !== rlMax || r.rlWindowMs !== rlWindowMs,
      );
      if (stale.length === 0) return;

      for (const r of stale) {
        await this.repo.update(r.id, { rlMax, rlWindowMs });
        this.logger.log(
          `Reconciled MailTester key ${r.id} rate from ${r.rlMax}/${r.rlWindowMs}ms → ${rlMax}/${rlWindowMs}ms`,
        );
        await this.sync.publish({ type: 'updated', keyId: r.id });
      }
      await this.sync.reloadAll(this.mailtester.name);
    } catch (e) {
      this.logger.error(`seed failed: ${(e as Error).message}`);
    }
  }
}
