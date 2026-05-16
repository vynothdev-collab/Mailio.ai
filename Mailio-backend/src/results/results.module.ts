import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email } from '../emails/entities/email.entity';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email, EmailList])],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
