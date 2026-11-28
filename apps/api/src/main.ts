import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** The three frontend apps' dev ports; overridden in any other environment via CORS_ORIGINS. */
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_JWT_SECRET) {
    throw new Error(
      'AUTH_JWT_SECRET must be set in production; refusing to start with the insecure local default.',
    );
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : DEFAULT_CORS_ORIGINS,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
