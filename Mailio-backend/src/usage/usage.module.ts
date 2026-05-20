import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email } from '../emails/entities/email.entity';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email, EmailList])],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
