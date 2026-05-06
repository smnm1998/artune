import { Module } from '@nestjs/common';
import { EmotionController } from './emotion.controller';
import { EmotionService } from './emotion.service';
import { OpenAIModule } from '../openai/openai.module';
import { SpotifyModule } from '../spotify/spotify.module';
import { DalleModule } from '../dalle/dalle.module';

/**
 * Emotion 모듈 - Orchestrator
 * - OpenAI, Spotify, DALL-E 모듈을 통합
 * - EmotionService를 제공하여 감정 분석 + 음악 추천 + 디저트 이미지 생성
 */
@Module({
  imports: [OpenAIModule, SpotifyModule, DalleModule],
  providers: [EmotionService],
  controllers: [EmotionController],
  exports: [EmotionService],
})
export class EmotionModule {}
