import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { CreditsService } from './credits.service';

@Module({
  imports: [TypeOrmModule.forFeature([CreditTransaction, Enterprise])],
  providers: [CreditsService],
  exports: [CreditsService, TypeOrmModule],
})
export class CreditsModule {}
