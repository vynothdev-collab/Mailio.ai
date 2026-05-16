import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailTesterModule } from '../mailtester/mailtester.module';
import { ApiKey } from './entities/api-key.entity';
import { EnvKeySeederService } from './env-key-seeder.service';
import { KeyHealthService } from './key-health.service';
import { KeyPoolService } from './key-pool.service';
import { KeyPoolSync } from './key-pool.sync';

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
