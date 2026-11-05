import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EmotionModule } from './emotion/emotion.module';
import { THROTTLE_OPTIONS } from './throttle.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 모든 모듈에서 사용 가능
      envFilePath: '.env',
    }),
    CacheModule.register({
      isGlobal: true,
      // 6시간 (ms). set()에 TTL을 따로 주지 않으면 이 값이 기본 수명이 된다.
      // max 옵션은 cache-manager v7(Keyv)에서 적용되지 않아 제거했다.
      ttl: 6 * 60 * 60 * 1000,
    }),
    ThrottlerModule.forRoot(THROTTLE_OPTIONS),
    EmotionModule,
  ],
  // 모든 경로에 IP당 요청 제한 (SSE 경로 포함)
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
