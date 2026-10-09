import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: false } }),
  );

  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
