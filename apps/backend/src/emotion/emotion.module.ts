import { Module } from '@nestjs/common';
import { EmotionController } from './emotion.controller';
import { EmotionService } from './emotion.service';
import { OpenAIModule } from '../openai/openai.module';
import { MusicModule } from '../music/music.module';
import { DalleModule } from '../dalle/dalle.module';

/** 감정 분석 + 추천 — OpenAI(선곡) · Music(곡 해석) · Dalle(감정별 아트워크) 모듈을 묶어 EmotionService를 제공한다 */
@Module({
  imports: [OpenAIModule, MusicModule, DalleModule],
  providers: [EmotionService],
  controllers: [EmotionController],
  exports: [EmotionService],
})
export class EmotionModule {}
