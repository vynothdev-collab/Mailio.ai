import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';

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
