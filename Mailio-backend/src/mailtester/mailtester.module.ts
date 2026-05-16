import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';
import { MailTesterService } from './mailtester.service';

/**
 * Shared keep-alive agents for the MailTester HTTP client.
 *
 * Default behaviour of @nestjs/axios is to use Node's globalAgent, which
 * does NOT keep TLS sockets warm between calls. Every Ninja verification
 * therefore paid a full TCP + TLS handshake (~50–200 ms) — a meaningful
 * tax on top of the third-party's own latency, and one that prevented
 * workers from re-using slots efficiently.
 *
 * `maxSockets: 64` covers the realistic in-flight call ceiling for a
 * single Node process:
 *   outer_concurrency (8) × batch_inner_concurrency (10) = 80 attempted
 * Per-host pooling means all keys / tenants share the same host, so 64
 * is comfortable headroom (KeyPool throttles total RPS anyway).
 *
 * `maxFreeSockets: 16` keeps a small warm pool between idle gaps without
 * leaking file descriptors.
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('MAILTESTER_TIMEOUT_MS', 30000),
        httpsAgent: new https.Agent({
          keepAlive: true,
          keepAliveMsecs: 30_000,
          maxSockets: parseInt(
            process.env.MAILTESTER_MAX_SOCKETS ?? '64',
            10,
          ),
          maxFreeSockets: parseInt(
            process.env.MAILTESTER_MAX_FREE_SOCKETS ?? '16',
            10,
          ),
        }),
        // Same agent on the http side for hypothetical non-TLS deployments
        // (staging proxies, etc.) — costs nothing if unused.
        httpAgent: new http.Agent({
          keepAlive: true,
          keepAliveMsecs: 30_000,
          maxSockets: 64,
          maxFreeSockets: 16,
        }),
      }),
    }),
  ],
  providers: [MailTesterService],
  exports: [MailTesterService],
})
export class MailTesterModule {}
