import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  // BullMQ key prefix — isolate queues per environment / deployment.
  // Defaults to BullMQ's "bull" so existing in-flight queues are not orphaned
  // on first deploy. Set BULL_PREFIX=mailio:{env} in each environment.
  bullPrefix: process.env.BULL_PREFIX || 'bull',
}));
