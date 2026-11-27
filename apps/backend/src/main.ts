import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CORS_OPTIONS } from './cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors(CORS_OPTIONS);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // 응답 시간 하네스(probe-latency)가 이 문구를 기다렸다가 요청을 보낸다 — 바꾸면 하네스도 같이
  new Logger('Bootstrap').log(`[Server] Running on port ${port}`);
}
bootstrap();
