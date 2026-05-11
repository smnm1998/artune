import { Controller, Post, Sse, Body, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EmotionService } from './emotion.service';

/**
 * Emotion Controller
 * 감정 분석 API 엔드포인트 제공
 */
@Controller('emotion')
export class EmotionController {
  constructor(private readonly emotionService: EmotionService) {}

  @Post('analyze')
  async analyze(@Body('text') text: string) {
    return await this.emotionService.analyzeAndRecommend(text);
  }

  /**
   * 텍스트 감정 분석 및 음악/디저트 추천 API (SSE - 진행률 포함)
   *
   * 이벤트 타입:
   * - progress: { type: 'progress', progress: number, message: string }
   * - complete: { type: 'complete', data: Object }
   * - error: { type: 'error', message: string }
   *
   * 예시:
   * GET /emotion/analyze-stream?text=오늘 정말 기분이 좋아!
   *
   * SSE Stream:
   * data: {"type":"progress","progress":0,"message":"감정 분석을 시작합니다..."}
   * data: {"type":"progress","progress":10,"message":"감정을 분석하고 있어요..."}
   * ...
   * data: {"type":"complete","data":{...}}
   */
  @Sse('analyze-stream')
  analyzeStream(@Query('text') text: string) {
    return new Observable((observer) => {
      (async () => {
        try {
          const result =
            await this.emotionService.analyzeAndRecommendWithProgress(
              text,
              (progress, message) => {
                observer.next({
                  data: {
                    type: 'progress',
                    progress,
                    message,
                  },
                });
              },
            );

          observer.next({
            data: {
              type: 'complete',
              data: result,
            },
          });
          observer.complete();
        } catch (error) {
          observer.next({
            data: {
              type: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : '감정 분석에 실패했습니다.',
            },
          });
          observer.error(error);
        }
      })();
    });
  }
}
