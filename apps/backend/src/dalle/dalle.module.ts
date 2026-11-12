import { Module } from '@nestjs/common';
import { DalleService } from './dalle.service';

/** 감정별 아트워크 — DalleService(지금은 정적 이미지)를 Emotion 모듈에 제공한다 */
@Module({
  providers: [DalleService],
  exports: [DalleService],
})
export class DalleModule {}
