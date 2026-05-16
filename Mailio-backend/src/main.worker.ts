import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';

/**
 * Worker process entrypoint. Loads BullMQ @Processors but no HTTP listener.
 *
 * Uses createApplicationContext (no Express) so the worker has zero exposed
 * surface area. PM2 should run this in `fork` mode, not `cluster`.
 *
 * The shutdown hook gives in-flight jobs up to BullMQ's default grace
 * window to finish before the process exits, so SIGTERM doesn't strand
 * jobs in the active state.
 */
async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    bufferLogs: false,
  });

  app.enableShutdownHooks();

  logger.log(
    `Worker bootstrapped (pid=${process.pid}, prefix=${process.env.BULL_PREFIX ?? 'bull'})`,
  );
}
void bootstrap();
