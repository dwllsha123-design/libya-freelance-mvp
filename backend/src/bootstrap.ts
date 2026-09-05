import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { authRateLimiters, isRateLimitDisabled } from './common/middleware/auth-rate-limit.js';

export function configureApp(app: NestExpressApplication) {
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  if (!isRateLimitDisabled()) {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );

    expressApp.use('/api/auth/login', authRateLimiters.login);
    expressApp.use('/api/auth/register', authRateLimiters.register);
    expressApp.use('/api/auth/forgot-password', authRateLimiters.forgotPassword);
    expressApp.use('/api/auth/reset-password', authRateLimiters.resetPassword);
    expressApp.use('/api/auth/refresh', authRateLimiters.refresh);
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Request'],
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads', 'profiles'), {
    prefix: '/uploads/profiles/',
  });

  app.useStaticAssets(join(process.cwd(), 'uploads', 'portfolio'), {
    prefix: '/uploads/portfolio/',
  });

  app.useStaticAssets(join(process.cwd(), 'uploads', 'chat'), {
    prefix: '/uploads/chat/',
  });
}

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  return app;
}
