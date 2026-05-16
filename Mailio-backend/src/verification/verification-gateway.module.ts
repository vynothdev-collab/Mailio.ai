import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { VerificationGateway } from './verification.gateway';

/**
 * Hosts the WebSocket gateway. Only loaded by processes that terminate
 * client connections (API + monolith). Worker processes deliberately omit
 * this so they don't bind a socket.io server.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [VerificationGateway],
  exports: [VerificationGateway],
})
export class VerificationGatewayModule {}
