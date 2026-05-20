import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationModule } from '../verification/verification.module';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { Email } from './entities/email.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Email]),
    forwardRef(() => VerificationModule),
  ],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
