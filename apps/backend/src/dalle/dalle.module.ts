import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DalleService } from './dalle.service';

/**
 * DALLE 감정 분석 모듈
 * - DalleService 제공하고 다른 모듈에서 사용할 수 있도록 export
 * - ConfigModule을 import하여 환경변수 접근 가능
 */
@Module({
  imports: [ConfigModule],
  providers: [DalleService],
  exports: [DalleService],
})
export class DalleModule {}
