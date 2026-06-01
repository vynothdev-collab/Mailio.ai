import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataScopeModule } from '../common/scope/data-scope.module';
import { Email } from '../emails/entities/email.entity';
import { VerificationModule } from '../verification/verification.module';
import { EmailListsController } from './email-lists.controller';
import { EmailListsService } from './email-lists.service';
import { EmailList } from './entities/email-list.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailList, Email]),
    forwardRef(() => VerificationModule),
    DataScopeModule,
  ],
  controllers: [EmailListsController],
  providers: [EmailListsService],
  exports: [EmailListsService],
})
export class EmailListsModule {}
