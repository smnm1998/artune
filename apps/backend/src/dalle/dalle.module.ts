import { Module } from '@nestjs/common';
import { DalleService } from './dalle.service';

/**
 * DALLE 감정 분석 모듈
 * - DalleService 제공하고 다른 모듈에서 사용할 수 있도록 export
 */
@Module({
  providers: [DalleService],
  exports: [DalleService],
})
export class DalleModule {}
