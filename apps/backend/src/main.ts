import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * 허용된 Origin 목록
 * - 개발 환경: localhost
 * - 프로덕션 환경: 실제 도메인
 */
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173', // Vite 기본 포트
    'http://localhost:3000', // 추가 개발 포트
    'https://om-artune.vercel.app', // 프로덕션 프론트엔드
  ];

  // 프로덕션 환경에서는 환경변수로 추가 origin 지정
  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  return origins;
};

/**
 * CORS Origin 검증 함수
 * @param {string} origin - 요청 origin
 * @param {Function} callback - CORS 콜백
 */
const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  const allowedOrigins = getAllowedOrigins();

  // Origin이 없는 경우 (예: 모바일 앱, Postman)
  if (!origin) {
    return callback(null, true);
  }

  // 허용된 Origin인지 확인
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // 프로덕션 환경에서는 차단, 개발 환경에서는 경고만
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  } else {
    console.warn(`[CORS] Warning - Unregistered origin: ${origin}`);
    return callback(null, true);
  }
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS 활성화 (Origin 검증 강화)
  app.enableCors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    // SSE를 위한 추가 헤더
    exposedHeaders: ['Content-Type'],
  });

  await app.listen(process.env.PORT || 3000);

  const allowedOrigins = getAllowedOrigins();
  console.log(`[Server] Running on port ${process.env.PORT || 3000}`);
  console.log(`[CORS] Allowed origins:`, allowedOrigins);
}
bootstrap();
