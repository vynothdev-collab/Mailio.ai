import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailOtp } from './entities/email-otp.entity';
import { IntegrationApiKey } from './entities/integration-api-key.entity';
import { EmailOtpService } from './email-otp.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { IntegrationApiKeyGuard } from './guards/integration-api-key.guard';
import { LinkedinAuthService } from './linkedin-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    HttpModule,
    MailModule,
    TypeOrmModule.forFeature([EmailOtp, IntegrationApiKey]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleTokenVerifierService,
    LinkedinAuthService,
    EmailOtpService,
    IntegrationApiKeyGuard,
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
