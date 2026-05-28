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
    synchronize: false,
    logging: false,
    extra: {
      max: parseInt(process.env.DB_POOL_MAX ?? '30', 10),
      min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
      
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
