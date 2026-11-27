import {
  Body,
  Controller,
  HttpException,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { EmotionStreamEvent } from '@artune/shared-types';
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

  /** 한 번에 받는 판 — 스트림과 같은 파이프라인의 최종 응답만 돌려준다 (측정 하네스 · curl용, 프론트는 아래 스트림) */
  @Post('analyze')
  async analyze(@Body('text') text: string, @Body('seen') seen?: SeenInput) {
    return await this.emotionService.analyzeAndRecommend(text, seen);
  }

  /**
   * 감정 분석 + 추천 (POST 스트리밍) — 프론트가 쓰는 경로.
   * 글과 이력을 본문으로 받고, AI가 곡을 쓰는 동안 고른 곡을 하나씩 흘려보낸다 (SSE 형식):
   * progress … → meta(감정·공감 문구·아트워크) → track(곡 하나씩, 모드별 최종 순서) … → complete | error.
   * 옛 GET(SSE)은 글이 주소에 실려 서버·프록시 로그에 남고 본문을 못 실어 POST로 옮겼고, 전환이 끝나 지웠다(11/12).
   * - 스트림을 열기 전 오류(빈 글·상한 초과)는 일반 HTTP 오류로 응답한다 — 응답 헤더는 첫 이벤트를 보낼 때 연다
   * - 연 뒤의 오류는 error 이벤트로 알린다
   * - 클라이언트가 끊으면 AI 생성과 iTunes 해석을 멈춘다 (보낼 곳 없는 일에 토큰·호출 한도를 쓰지 않게)
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

    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) abort.abort(); // 다 보내기 전에 연결이 닫혔다
    });

    try {
      const data = await this.emotionService.analyzeStream(text, seen, {
        signal: abort.signal,
        onProgress: (progress, message) =>
          send({ type: 'progress', progress, message }),
        onMeta: (meta) => send({ type: 'meta', data: meta }),
        onTrack: (mode, index, track) =>
          send({ type: 'track', mode, index, track }),
      });
      send({ type: 'complete', data });
    } catch (error) {
      // 아직 아무것도 보내지 않았으면 Nest 예외 필터가 HTTP 오류(400 등)로 응답한다
      if (!res.headersSent) throw error;
      if (abort.signal.aborted) return; // 클라이언트가 끊었다 — 알릴 곳이 없다
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
}
