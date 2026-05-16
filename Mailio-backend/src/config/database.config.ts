import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'mailioai',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    // synchronize is disabled in every env. Schema changes go through
    // migrations only — keeps dev/prod aligned and avoids surprise
    // ALTERs when entities change.
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    // pg-pool sizing. Worker-slot demand per Node process (worst case):
    //   verify.bulk(8) + verify.high(4) + db.write(16) + API requests
    //   + background (KeyPool, starvation guard) ≈ 28+
    // Default of 10 starves under load and shows up as p99 latency
    // spikes on the hot path (tryClaimMany, saveResultsBatch).
    // Override via DB_POOL_MAX; min stays low so idle processes don't
    // hold connections unnecessarily.
    extra: {
      max: parseInt(process.env.DB_POOL_MAX ?? '30', 10),
      min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
      // pg-pool default idle is 10s; bump so workers waking from a
      // brief idle period don't re-handshake to Postgres every time.
      idleTimeoutMillis: parseInt(
        process.env.DB_POOL_IDLE_TIMEOUT_MS ?? '30000',
        10,
      ),
      connectionTimeoutMillis: parseInt(
        process.env.DB_POOL_CONN_TIMEOUT_MS ?? '5000',
        10,
      ),
    },
  }),
);
