import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataScopeModule } from '../common/scope/data-scope.module';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email } from '../emails/entities/email.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email, EmailList]), DataScopeModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
