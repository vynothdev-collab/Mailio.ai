import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { EmailList } from '../email-lists/entities/email-list.entity';
import { Email } from '../emails/entities/email.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/entities/user.entity';
import { EnterpriseScopeController } from './enterprise-scope.controller';
import { EnterpriseScopeService } from './enterprise-scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Enterprise,
      Email,
      EmailList,
      CreditTransaction,
    ]),
    MailModule,
  ],
  controllers: [EnterpriseScopeController],
  providers: [EnterpriseScopeService],
})
export class EnterpriseScopeModule {}
