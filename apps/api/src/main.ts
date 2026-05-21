import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  // Railway/Vercel/Render تستخدم متغير PORT الديناميكي
  const port = parseInt(process.env.PORT ?? '', 10) || config.get<number>('API_PORT', 4000);

  // Security
  app.use(helmet());

  // CORS — اقرأ الـ origins المسموحة من البيئة
  // في الإنتاج: CORS_ORIGINS="https://your-app.vercel.app,https://app.jawhara.com"
  // في التطوير: نسمح للجميع
  const corsOriginsEnv = config.get<string>('CORS_ORIGINS', '');
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : true; // true = السماح للجميع (للتطوير فقط)

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('JawharaERP API')
    .setDescription('Jewelry ERP — REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // 0.0.0.0 ضروري لـ Railway/Render/Docker (وإلا الخدمة لا تستقبل من الخارج)
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 JawharaERP API running on port ${port}`);
  logger.log(`📘 API docs: /api/docs`);
}

bootstrap();
