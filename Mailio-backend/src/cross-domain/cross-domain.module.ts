import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CrossDomainController } from './cross-domain.controller';
import { CrossDomainApiKeyGuard } from './guards/cross-domain-api-key.guard';

@Module({
  imports: [UsersModule],
  controllers: [CrossDomainController],
  providers: [CrossDomainApiKeyGuard],
})
export class CrossDomainModule {}
