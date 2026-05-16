import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailTesterModule } from '../mailtester/mailtester.module';
import { ApiKey } from './entities/api-key.entity';
import { EnvKeySeederService } from './env-key-seeder.service';
import { KeyHealthService } from './key-health.service';
import { KeyPoolService } from './key-pool.service';
import { KeyPoolSync } from './key-pool.sync';

/**
 * Owns the runtime credential lifecycle: registry (DB), hot snapshot,
 * acquire/report API, health recovery, and env-fallback seeding.
 *
 * Global so the verification processor (in any process) can inject
 * KeyPoolService without re-importing this module's transitive deps.
 *
 * Runs the same in every process role:
 *   - API     → uses KeyPool for the sync /verify/single path
 *   - Worker  → uses KeyPool from the processor
 *   - Monolith→ both
 *
 * The Pub/Sub bus + health-monitor Redis lock make running multiple
 * instances safe; the lock ensures only one process performs cooldown
 * recovery per tick.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), MailTesterModule],
  providers: [
    KeyPoolService,
    KeyPoolSync,
    KeyHealthService,
    EnvKeySeederService,
  ],
  exports: [KeyPoolService, KeyPoolSync],
})
export class ProvidersModule {}
