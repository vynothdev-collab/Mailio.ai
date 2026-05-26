import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminOtpService } from './admin-otp.service';
import { Admin } from './entities/admin.entity';
import { AdminOtp } from './entities/admin-otp.entity';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([Admin, AdminOtp]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.adminSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminOtpService, AdminJwtStrategy],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
