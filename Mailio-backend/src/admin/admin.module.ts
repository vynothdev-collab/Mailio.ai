import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { DlqModule } from '../dlq/dlq.module';
import { ApiKey } from '../providers/entities/api-key.entity';
import {
  VERIFY_BULK_QUEUE,
  VERIFY_HIGH_QUEUE,
} from '../verification/verification.service';
import { AdminDlqController } from './admin-dlq.controller';
import { AdminKeysController } from './admin-keys.controller';
import { basicAuthMiddleware } from './basic-auth.middleware';
import { MetricsController } from './metrics.controller';

const BULL_BOARD_ROUTE = '/admin/queues';
const ADMIN_KEYS_ROUTE = 'admin/keys';
const ADMIN_DLQ_ROUTE = 'admin/dlq';
const ADMIN_METRICS_ROUTE = 'admin/metrics';

const MONITORED_QUEUES = [
  VERIFY_HIGH_QUEUE,
  VERIFY_BULK_QUEUE,
  'db.write',
  'csv.parse',
];

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: BULL_BOARD_ROUTE,
      adapter: ExpressAdapter,
    }),
    BullModule.registerQueue(...MONITORED_QUEUES.map((name) => ({ name }))),
    ...MONITORED_QUEUES.map((name) =>
      BullBoardModule.forFeature({ name, adapter: BullMQAdapter }),
    ),
    TypeOrmModule.forFeature([ApiKey]),
    DlqModule,
  ],
  controllers: [AdminKeysController, AdminDlqController, MetricsController],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Bull Board, keys CRUD, and DLQ CRUD all share the same gate.
    consumer
      .apply(basicAuthMiddleware)
      .forRoutes(
        BULL_BOARD_ROUTE,
        ADMIN_KEYS_ROUTE,
        `${ADMIN_KEYS_ROUTE}/*path`,
        ADMIN_DLQ_ROUTE,
        `${ADMIN_DLQ_ROUTE}/*path`,
        ADMIN_METRICS_ROUTE,
      );
  }
}
