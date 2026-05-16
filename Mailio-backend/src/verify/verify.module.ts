import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsvParseModule } from '../csv-parse/csv-parse.module';
import { EmailListsModule } from '../email-lists/email-lists.module';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email } from '../emails/entities/email.entity';
import { MailTesterModule } from '../mailtester/mailtester.module';
import { VerificationModule } from '../verification/verification.module';
import { BulkVerifyController } from './bulk/bulk-verify.controller';
import { BulkVerifyService } from './bulk/bulk-verify.service';
import { SingleVerifyController } from './single/single-verify.controller';
import { SingleVerifyService } from './single/single-verify.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Email, EmailList]),
    MailTesterModule,
    forwardRef(() => EmailListsModule),
    forwardRef(() => VerificationModule),
    CsvParseModule,
  ],
  controllers: [SingleVerifyController, BulkVerifyController],
  providers: [SingleVerifyService, BulkVerifyService],
})
export class VerifyModule {}
