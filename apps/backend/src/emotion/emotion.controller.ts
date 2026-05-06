import { Controller, Post, Scope, Sse, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { EmotionService } from './emotion.service';

/**
 * Emotion Controller
 * 감정 분석 API 엔드포인트 제공
 */
@Controller({
  path: 'emotion',
  scope: Scope.REQUEST,
})
export class EmotionController {
  constructor(
    private readonly emotionService: EmotionService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * 텍스트 감정 분석 및 음악/디저트 추천 API
   *
   * @route POST /emotion/analyze
   * @param {Object} body - { text: string }
   * @returns {Promise<{emotion: Object, recommendations: Array, dessertImage: Object}>}
   *
   * 예시:
   * POST /emotion/analyze
   * Body: { "text": "오늘 정말 기분이 좋아!" }
   *
   * Response: {
   *   emotion: { emotion: 'joy', emotionLabel: '기쁨', ... },
   *   recommendations: [{ id: '...', name: '...', ... }],
   *   dessertImage: { imageUrl: '...', prompt: '...' }
   * }
   */
  @Post('analyze')
  async analyze() {
    const { text } = this.request.body;
    return await this.emotionService.analyzeAndRecommend(text);
  }

  /**
   * 텍스트 감정 분석 및 음악/디저트 추천 API (SSE - 진행률 포함)
   *
   * @route GET /emotion/analyze-stream?text=...
   * @param {string} text - 분석할 텍스트 (query parameter)
   * @returns {Observable} Server-Sent Events 스트림
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
  analyzeStream() {
    const text = this.request.query.text as string;

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
              message: error.message || '감정 분석에 실패했습니다.',
            },
          });
          observer.error(error);
        }
      })();
    });
  }
}
