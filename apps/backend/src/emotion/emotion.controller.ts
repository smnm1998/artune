import { Controller, Post, Sse, Body, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EmotionService, SeenInput } from './emotion.service';

/**
 * Emotion Controller
 * 감정 분석 API 엔드포인트 제공
 */
@Controller('emotion')
export class EmotionController {
  constructor(private readonly emotionService: EmotionService) {}

  @Post('analyze')
  async analyze(@Body('text') text: string, @Body('seen') seen?: SeenInput) {
    return await this.emotionService.analyzeAndRecommend(text, seen);
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
   * GET /emotion/analyze-stream?text=오늘 정말 기분이 좋아!&seenImmerse=1a2b3c4d,5e6f7a8b&seenSoothe=9c0d1e2f
   * - seenImmerse·seenSoothe: 이 사람이 최근 본 곡 키(쉼표로 이음, 모드별 최근 40곡) — 없어도 된다
   *
   * SSE Stream:
   * data: {"type":"progress","progress":0,"message":"감정 분석을 시작합니다..."}
   * data: {"type":"progress","progress":10,"message":"감정을 분석하고 있어요..."}
   * ...
   * data: {"type":"complete","data":{...}}
   */
  @Sse('analyze-stream')
  analyzeStream(
    @Query('text') text: string,
    @Query('seenImmerse') seenImmerse?: string,
    @Query('seenSoothe') seenSoothe?: string,
  ) {
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
              { immerse: seenImmerse, soothe: seenSoothe },
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
