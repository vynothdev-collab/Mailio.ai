import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { UsageModule } from '../usage/usage.module';
import { VerificationModule } from '../verification/verification.module';
import { CsvParseProcessor } from './csv-parse.processor';
import { CsvParseService } from './csv-parse.service';
import { CSV_PARSE_QUEUE } from './csv-parse.types';

@Module({
  imports: [
    BullModule.registerQueue({
      name: CSV_PARSE_QUEUE,
      defaultJobOptions: {
        
        attempts: parseInt(process.env.CSV_PARSE_MAX_RETRIES ?? '2', 10),
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400, count: 500 },
        removeOnFail: { age: 7 * 86400 },
      },
    }),
    TypeOrmModule.forFeature([EmailList]),
    VerificationModule,
    UsageModule,
  ],
  providers: [CsvParseService, CsvParseProcessor],
  exports: [CsvParseService],
})
export class CsvParseModule {}
