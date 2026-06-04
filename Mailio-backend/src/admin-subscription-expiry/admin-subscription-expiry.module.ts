import { Module } from '@nestjs/common';
import { AdminSubscriptionExpiryController } from './admin-subscription-expiry.controller';
import { AdminSubscriptionExpiryService } from './admin-subscription-expiry.service';

@Module({
  controllers: [AdminSubscriptionExpiryController],
  providers: [AdminSubscriptionExpiryService],
})
export class AdminSubscriptionExpiryModule {}
