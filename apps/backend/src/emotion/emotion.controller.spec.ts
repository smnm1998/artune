import { Test, TestingModule } from '@nestjs/testing';
import { Observable } from 'rxjs';
import { EmotionController } from './emotion.controller';
import { EmotionService } from './emotion.service';

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
      );
      expect(result).toEqual(mockResult);
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
      ).toHaveBeenCalledWith('오늘 행복해요', expect.any(Function));
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

      const { events } = await collectStream(controller.analyzeStream('테스트'));

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
