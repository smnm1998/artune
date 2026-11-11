import { EventEmitter } from 'node:events';
import { BadRequestException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import * as request from 'supertest';
import { EmotionController } from './emotion.controller';
import { EmotionService } from './emotion.service';
import { THROTTLE_OPTIONS } from '../throttle.config';

/**
 * SSE Observable의 방출을 수집한다.
 * analyzeStream은 subscribe 시점에 async IIFE를 돌리므로
 * complete/error가 올 때까지 기다렸다가 결과를 반환해야 한다.
 */
function collectStream(observable: Observable<unknown>) {
  return new Promise<{
    events: any[];
    completed: boolean;
    error: unknown;
  }>((resolve) => {
    const events: any[] = [];
    observable.subscribe({
      next: (value) => events.push(value),
      error: (error) => resolve({ events, completed: false, error }),
      complete: () => resolve({ events, completed: true, error: null }),
    });
  });
}

describe('EmotionController', () => {
  let controller: EmotionController;
  let emotionService: jest.Mocked<EmotionService>;

  const mockResult = {
    emotionLabel: '기쁨',
    description: '즐거운 하루였군요.',
    crisis: false,
    artwork: { url: '/artwork/joy.png', prompt: 'test' },
    playlists: {
      immerse: { modeLabel: '감정 심취', description: 'd', tracks: [] },
      soothe: { modeLabel: '감정 완화', description: 'd', tracks: [] },
    },
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [EmotionController],
      providers: [
        {
          provide: EmotionService,
          useValue: {
            analyzeAndRecommend: jest.fn(),
            analyzeAndRecommendWithProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(EmotionController);
    emotionService = moduleRef.get(EmotionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /analyze', () => {
    it('서비스에 텍스트를 위임하고 결과를 반환한다.', async () => {
      emotionService.analyzeAndRecommend.mockResolvedValueOnce(mockResult);

      const result = await controller.analyze('오늘 행복해요');

      expect(emotionService.analyzeAndRecommend).toHaveBeenCalledWith(
        '오늘 행복해요',
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('본문의 이력(seen)을 서비스에 넘긴다.', async () => {
      emotionService.analyzeAndRecommend.mockResolvedValueOnce(mockResult);
      const seen = { immerse: ['1a2b3c4d'], soothe: [] };

      await controller.analyze('오늘 행복해요', seen);

      expect(emotionService.analyzeAndRecommend).toHaveBeenCalledWith(
        '오늘 행복해요',
        seen,
      );
    });

    it('서비스 에러를 그대로 전파한다.', async () => {
      emotionService.analyzeAndRecommend.mockRejectedValueOnce(
        new Error('분석할 텍스트가 필요합니다.'),
      );

      await expect(controller.analyze('')).rejects.toThrow(
        '분석할 텍스트가 필요합니다.',
      );
    });
  });

  describe('SSE /analyze-stream', () => {
    it('진행률 콜백을 progress 이벤트로 방출하고 complete로 종료한다.', async () => {
      emotionService.analyzeAndRecommendWithProgress.mockImplementationOnce(
        async (_text, onProgress) => {
          onProgress(0, '시작');
          onProgress(50, '진행 중');
          onProgress(100, '완료!');
          return mockResult;
        },
      );

      const { events, completed, error } = await collectStream(
        controller.analyzeStream('오늘 행복해요'),
      );

      expect(error).toBeNull();
      expect(completed).toBe(true);

      // progress 3건 + complete 1건
      expect(events).toHaveLength(4);
      expect(events.slice(0, 3)).toEqual([
        { data: { type: 'progress', progress: 0, message: '시작' } },
        { data: { type: 'progress', progress: 50, message: '진행 중' } },
        { data: { type: 'progress', progress: 100, message: '완료!' } },
      ]);
      expect(events[3]).toEqual({
        data: { type: 'complete', data: mockResult },
      });

      expect(
        emotionService.analyzeAndRecommendWithProgress,
      ).toHaveBeenCalledWith('오늘 행복해요', expect.any(Function), {
        immerse: undefined,
        soothe: undefined,
      });
    });

    it('쿼리의 모드별 이력(seenImmerse·seenSoothe)을 서비스에 넘긴다.', async () => {
      emotionService.analyzeAndRecommendWithProgress.mockResolvedValueOnce(
        mockResult,
      );

      await collectStream(
        controller.analyzeStream('테스트', '1a2b3c4d,5e6f7a8b', '9c0d1e2f'),
      );

      expect(
        emotionService.analyzeAndRecommendWithProgress,
      ).toHaveBeenCalledWith('테스트', expect.any(Function), {
        immerse: '1a2b3c4d,5e6f7a8b',
        soothe: '9c0d1e2f',
      });
    });

    it('서비스 실패 시 error 이벤트를 방출한 뒤 스트림을 에러로 종료한다.', async () => {
      const failure = new Error('OpenAI API 에러 (429): rate limit');
      emotionService.analyzeAndRecommendWithProgress.mockRejectedValueOnce(
        failure,
      );

      const { events, completed, error } = await collectStream(
        controller.analyzeStream('테스트'),
      );

      // 클라이언트가 메시지를 읽을 수 있도록 error 이벤트를 먼저 방출
      expect(events).toEqual([
        {
          data: {
            type: 'error',
            message: 'OpenAI API 에러 (429): rate limit',
          },
        },
      ]);
      // 그 다음 스트림 자체를 에러로 종료 (complete 아님)
      expect(completed).toBe(false);
      expect(error).toBe(failure);
    });

    it('Error가 아닌 값으로 실패하면 기본 메시지를 사용한다.', async () => {
      emotionService.analyzeAndRecommendWithProgress.mockRejectedValueOnce(
        'string rejection',
      );

      const { events } = await collectStream(
        controller.analyzeStream('테스트'),
      );

      expect(events).toEqual([
        {
          data: { type: 'error', message: '감정 분석에 실패했습니다.' },
        },
      ]);
    });

    it('진행률 이벤트 없이 완료돼도 complete 이벤트는 방출된다.', async () => {
      emotionService.analyzeAndRecommendWithProgress.mockResolvedValueOnce(
        mockResult,
      );

      const { events, completed } = await collectStream(
        controller.analyzeStream('테스트'),
      );

      expect(events).toEqual([
        { data: { type: 'complete', data: mockResult } },
      ]);
      expect(completed).toBe(true);
    });
  });
});

// 응답에 직접 쓰는(@Res) 경로라 실제 HTTP 요청으로 본문의 이벤트 순서를 확인한다
describe('POST /emotion/analyze-stream (스트리밍)', () => {
  let app: NestExpressApplication;
  const service = { analyzeStream: jest.fn() };

  beforeEach(async () => {
    service.analyzeStream.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [EmotionController],
      providers: [{ provide: EmotionService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await app.init();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 테스트에서 건 Logger 감시가 다음 테스트로 새지 않게
    return app.close();
  });

  const post = (body: object) =>
    request(app.getHttpServer()).post('/emotion/analyze-stream').send(body);
  /** 응답 본문(data: …\n\n 프레임들)을 이벤트 배열로 */
  const events = (body: string) =>
    body
      .split('\n\n')
      .filter(Boolean)
      .map((frame) => JSON.parse(frame.replace(/^data: /, '')));

  it('진행률·meta·곡을 받는 대로 흘려보내고 complete로 끝낸다', async () => {
    const meta = { emotionLabel: '기쁨', playlists: {} };
    const track = { id: '1', name: '좋은 날' };
    service.analyzeStream.mockImplementation(
      async (_text, _seen, { onProgress, onMeta, onTrack }) => {
        onProgress(10, '분석 중');
        onMeta(meta);
        onTrack('immerse', 0, track);
        return { emotionLabel: '기쁨' };
      },
    );

    const res = await post({ text: '오늘 좋았어' }).expect(200);

    expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
    expect(events(res.text)).toEqual([
      { type: 'progress', progress: 10, message: '분석 중' },
      { type: 'meta', data: meta },
      { type: 'track', mode: 'immerse', index: 0, track },
      { type: 'complete', data: { emotionLabel: '기쁨' } },
    ]);
  });

  it('본문의 글과 이력(seen)을 서비스에 넘긴다', async () => {
    service.analyzeStream.mockResolvedValue({});
    const seen = { immerse: ['0000000a'], soothe: [] };

    await post({ text: '기분 좋아', seen }).expect(200);

    expect(service.analyzeStream).toHaveBeenCalledWith(
      '기분 좋아',
      seen,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('스트림을 열기 전 실패(빈 글)는 HTTP 400과 안내 문구로 응답한다', async () => {
    service.analyzeStream.mockRejectedValue(
      new BadRequestException('분석할 텍스트가 필요합니다.'),
    );

    const res = await post({ text: '' }).expect(400);

    expect(res.body.message).toBe('분석할 텍스트가 필요합니다.');
  });

  it('스트림을 연 뒤 실패하면 error 이벤트로 알리고, 서버 내부 메시지는 내보내지 않는다', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    service.analyzeStream.mockImplementation(
      async (_text, _seen, { onProgress }) => {
        onProgress(10, '분석 중');
        throw new Error('OpenAI API 에러 (401): Incorrect API key provided');
      },
    );

    const res = await post({ text: '오늘 좋았어' }).expect(200);

    expect(events(res.text).at(-1)).toEqual({
      type: 'error',
      message: EmotionController.STREAM_FAILED,
    });
    expect(res.text).not.toContain('OpenAI');
  });

  it('클라이언트가 끊으면 서비스에 넘긴 신호를 취소하고, 그 뒤로는 아무것도 쓰지 않는다', async () => {
    /** 컨트롤러가 쓰는 만큼만 흉내 낸 응답 — close를 직접 일으킨다 */
    class FakeResponse extends EventEmitter {
      headersSent = false;
      destroyed = false;
      writableFinished = false;
      written: string[] = [];
      status() {
        return this;
      }
      set() {
        return this;
      }
      flushHeaders() {
        this.headersSent = true;
      }
      write(chunk: string) {
        this.written.push(chunk);
        return true;
      }
      end() {
        this.writableFinished = true;
      }
    }
    let signal!: AbortSignal;
    let fail!: (error: Error) => void;
    service.analyzeStream.mockImplementation(
      (_text, _seen, handlers) =>
        new Promise((_resolve, reject) => {
          signal = handlers.signal;
          handlers.onProgress(10, '분석 중');
          fail = reject;
        }),
    );
    const controller = app.get(EmotionController);
    const res = new FakeResponse();
    const logged = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const done = controller.analyzeStreamPost(
      '오늘 좋았어',
      undefined,
      res as unknown as Response,
    );
    res.destroyed = true;
    res.emit('close');
    expect(signal.aborted).toBe(true);
    fail(new Error('canceled'));
    await done;

    expect(res.written).toHaveLength(1); // 끊기 전에 보낸 진행률 하나뿐 — error 이벤트를 쓰지 않는다
    expect(logged).not.toHaveBeenCalled(); // 사용자가 떠난 건 서버 오류가 아니다
  });
});

// 운영과 같은 제한 값·IP 기준으로 실제 HTTP 요청을 보낸다 (AppModule은 .env를 불러와서 쓰지 않는다)
describe('요청 제한 (IP당)', () => {
  let app: NestExpressApplication;
  const [{ limit }] = THROTTLE_OPTIONS.throttlers;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLE_OPTIONS)],
      controllers: [EmotionController],
      providers: [
        {
          provide: EmotionService,
          useValue: { analyzeAndRecommend: jest.fn().mockResolvedValue({}) },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await app.init();
  });

  afterEach(() => app.close());

  const post = () => request(app.getHttpServer()).post('/emotion/analyze');
  // Railway 엣지가 넣는 것처럼 클라이언트 IP를 X-Real-IP로 보낸다
  const analyze = (ip: string) =>
    post().set('X-Real-IP', ip).send({ text: '오늘 좋았어' });

  it('같은 IP가 분당 한도를 넘으면 429와 안내 문구를 돌려준다', async () => {
    for (let i = 0; i < limit; i++) await analyze('203.0.113.1').expect(201);

    const res = await analyze('203.0.113.1').expect(429);
    expect(res.body.message).toBe(THROTTLE_OPTIONS.errorMessage);
  });

  it('X-Real-IP별로 따로 센다', async () => {
    for (let i = 0; i < limit; i++) await analyze('203.0.113.1').expect(201);

    await analyze('203.0.113.2').expect(201);
  });

  // 11/9 운영: X-Forwarded-For로 센 IP가 요청마다 달라 한도가 걸리지 않았다
  it('X-Forwarded-For가 요청마다 달라도 X-Real-IP가 같으면 한 사람으로 센다', async () => {
    const send = (i: number) =>
      post()
        .set('X-Real-IP', '203.0.113.1')
        .set('X-Forwarded-For', `198.51.100.${i}`)
        .send({ text: '오늘 좋았어' });
    for (let i = 0; i < limit; i++) await send(i).expect(201);

    await send(limit).expect(429);
  });

  it('X-Real-IP가 없으면(로컬) 접속 주소로 센다', async () => {
    const send = () => post().send({ text: '오늘 좋았어' });
    for (let i = 0; i < limit; i++) await send().expect(201);

    await send().expect(429);
  });
});
