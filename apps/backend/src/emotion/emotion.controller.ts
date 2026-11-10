import {
  Body,
  Controller,
  HttpException,
  Logger,
  Post,
  Query,
  Res,
  Sse,
} from '@nestjs/common';
import type { Response } from 'express';
import type { EmotionStreamEvent } from '@artune/shared-types';
import { Observable } from 'rxjs';
import { EmotionService, SeenInput } from './emotion.service';

/**
 * Emotion Controller
 * 감정 분석 API 엔드포인트 제공
 */
@Controller('emotion')
export class EmotionController {
  /** 스트림을 연 뒤 실패했을 때 사용자에게 보내는 문구 — 서버 내부 메시지(외부 API 오류 등)는 로그에만 남긴다 */
  static readonly STREAM_FAILED =
    '감정 분석에 실패했습니다. 잠시 후 다시 시도해주세요.';

  private readonly logger = new Logger(EmotionController.name);

  constructor(private readonly emotionService: EmotionService) {}

  @Post('analyze')
  async analyze(@Body('text') text: string, @Body('seen') seen?: SeenInput) {
    return await this.emotionService.analyzeAndRecommend(text, seen);
  }

  /**
   * 감정 분석 + 추천 (POST 스트리밍) — 프론트가 쓰는 경로.
   * 글과 이력을 본문으로 받고, 진행률·결과를 GET analyze-stream과 같은 이벤트(progress → complete | error)로 흘려보낸다.
   * GET은 글이 주소에 실려 서버·프록시 로그에 남고 본문을 못 실어 POST로 옮겼다 (GET은 배포 전환이 끝나면 지운다).
   * - 스트림을 열기 전 오류(빈 글·상한 초과)는 일반 HTTP 오류로 응답한다 — 응답 헤더는 첫 이벤트를 보낼 때 연다
   * - 연 뒤의 오류는 error 이벤트로 알린다
   */
  @Post('analyze-stream')
  async analyzeStreamPost(
    @Body('text') text: string,
    @Body('seen') seen: SeenInput | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const send = (event: EmotionStreamEvent) => {
      if (res.destroyed) return; // 클라이언트가 먼저 끊었으면 쓰지 않는다
      if (!res.headersSent) {
        res.status(200).set({
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        });
        res.flushHeaders();
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const data = await this.emotionService.analyzeAndRecommendWithProgress(
        text,
        (progress: number, message: string) =>
          send({ type: 'progress', progress, message }),
        seen,
      );
      send({ type: 'complete', data });
    } catch (error) {
      // 아직 아무것도 보내지 않았으면 Nest 예외 필터가 HTTP 오류(400 등)로 응답한다
      if (!res.headersSent) throw error;
      this.logger.error(
        `스트림 중 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      send({
        type: 'error',
        message:
          error instanceof HttpException
            ? error.message
            : EmotionController.STREAM_FAILED,
      });
    }
    res.end();
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
