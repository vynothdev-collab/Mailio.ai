import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActivityLogsModule } from '../admin-activity-logs/admin-activity-logs.module';
import { CreditsModule } from '../credits/credits.module';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { User } from '../users/entities/user.entity';
import { AdminCreditsController } from './admin-credits.controller';
import { AdminCreditsService } from './admin-credits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditTransaction, User, Enterprise]),
    AdminActivityLogsModule,
    CreditsModule,
  ],
  controllers: [AdminCreditsController],
  providers: [AdminCreditsService],
})
export class AdminCreditsModule {}
