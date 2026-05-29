import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';
import { MailTesterService } from './mailtester.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => ({
        httpsAgent: new https.Agent({
          keepAlive: true,
          keepAliveMsecs: 30_000,
          maxSockets: parseInt(process.env.MAILTESTER_MAX_SOCKETS ?? '256', 10),
          maxFreeSockets: parseInt(
            process.env.MAILTESTER_MAX_FREE_SOCKETS ?? '64',
            10,
          ),
        }),
        httpAgent: new http.Agent({
          keepAlive: true,
          keepAliveMsecs: 30_000,
          maxSockets: parseInt(process.env.MAILTESTER_MAX_SOCKETS ?? '256', 10),
          maxFreeSockets: parseInt(
            process.env.MAILTESTER_MAX_FREE_SOCKETS ?? '64',
            10,
          ),
        }),
      }),
    }),
  ],
  providers: [MailTesterService],
  exports: [MailTesterService],
})
export class MailTesterModule {}
