import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActivityLogsModule } from '../admin-activity-logs/admin-activity-logs.module';
import { CreditsModule } from '../credits/credits.module';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/entities/user.entity';
import { AdminEnterprisesController } from './admin-enterprises.controller';
import { AdminEnterprisesService } from './admin-enterprises.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enterprise, User]),
    AdminActivityLogsModule,
    CreditsModule,
    MailModule,
  ],
  controllers: [AdminEnterprisesController],
  providers: [AdminEnterprisesService],
})
export class AdminEnterprisesModule {}
