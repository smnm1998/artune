import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';

/**
 * OpenAI 감정 분석 모듈
 * - OpenAIService를 제공하고 다른 모듈에서 사용할 수 있도록 export
 * - ConfigModule을 import하여 환경변수 접근 가능
 */
@Module({
  imports: [ConfigModule],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}
