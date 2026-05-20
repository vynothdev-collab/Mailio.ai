import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ApiAppModule } from './api-app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(ApiAppModule);

  app.enableShutdownHooks();

  app.use(helmet());
  app.enableCors({
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
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
