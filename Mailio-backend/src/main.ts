import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.use(helmet());
  app.enableCors({
    // Expose Content-Disposition so the browser can read the server-supplied
    // filename when downloading bulk results.
    exposedHeaders: ['Content-Disposition'],
  });

  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('Mailio.ai API')
    .setDescription(
      'Email verification SaaS — single-address and bulk list verification powered by MailTester Ninja.\n\n' +
        '**Auth:** All protected routes require `Authorization: Bearer <accessToken>`.\n\n' +
        'Use `POST /auth/login` or `POST /auth/signup` to obtain tokens.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('auth', 'Register, login, logout and token refresh')
    .addTag('users', 'Current user profile and stats')
    .addTag('single-verify', 'Synchronous single-address verification')
    .addTag('bulk-verify', 'Asynchronous bulk verification via file upload')
    .addTag('email-lists', 'Manage and export bulk email lists')
    .addTag('dashboard', 'Aggregate stats and charts for the dashboard UI')
    .addTag('account', 'Plan usage and billing info')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
