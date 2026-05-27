import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { EmailOtp } from '../auth/entities/email-otp.entity';
import { EmailOtpService } from '../auth/email-otp.service';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, EmailOtp]), MailModule],
  controllers: [UsersController],
  providers: [UsersService, EmailOtpService],
  exports: [UsersService],
})
export class UsersModule {}
