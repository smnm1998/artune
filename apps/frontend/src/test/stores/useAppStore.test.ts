import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useAppStore from '@/stores/useAppStore';
import { analyzeEmotionWithProgress } from '@/api/emotionApi';
import type { EmotionResponse } from '@/api/emotionApi';
import type { Track } from '@/types/track';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { loadSeen } from '@/utils/seenHistory';

vi.mock('@/api/emotionApi', () => ({
  analyzeEmotionWithProgress: vi.fn(),
}));

const mockedAnalyze = vi.mocked(analyzeEmotionWithProgress);

const mockResult: EmotionResponse = {
  emotionLabel: '기쁨',
  description: '즐거운 하루였군요.',
  crisis: false,
  artwork: { url: '/artwork/joy.png', prompt: '' },
  playlists: {
    immerse: { modeLabel: '감정 심취', description: '', tracks: [] },
    soothe: { modeLabel: '감정 완화', description: '', tracks: [] },
  },
};

/** 곡 키만 의미 있는 곡 — 이력 테스트용 */
const trackOf = (key: string): Track => ({
  id: key,
  name: '',
  artists: [],
  album: { name: '', images: [] },
  duration_ms: 0,
  preview_url: null,
  appleMusicUrl: '',
  key,
});

const resultWithKeys = (
  immerse: string[],
  soothe: string[],
): EmotionResponse => ({
  ...mockResult,
  playlists: {
    immerse: { ...mockResult.playlists.immerse, tracks: immerse.map(trackOf) },
    soothe: { ...mockResult.playlists.soothe, tracks: soothe.map(trackOf) },
  },
});

/** 끝나지 않는 요청 (진행 중 상태를 만들기 위함) */
const pending = () => new Promise<EmotionResponse>(() => {});

/** 실제 SSE 처럼 signal 의 abort 에 반응하는 요청 */
const abortable = (signal?: AbortSignal) =>
  new Promise<EmotionResponse>((_, reject) => {
    signal?.addEventListener('abort', () =>
      reject(new DOMException('취소되었습니다.', 'AbortError')),
    );
  });

const state = () => useAppStore.getState();

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('초기 상태', () => {
    it('올바른 초기값을 가져야 함', () => {
      expect(state()).toMatchObject({
        currentPage: 'input',
        isLoading: false,
        progress: 0,
        emotionResult: null,
        error: null,
      });
    });
  });

  describe('setPage', () => {
    it('페이지를 변경할 수 있어야 함', () => {
      state().setPage('result');
      expect(state().currentPage).toBe('result');
    });
  });

  describe('analyzeEmotion', () => {
    it('요청이 시작되면 로딩 페이지로 전환하고 상태를 초기화한다', () => {
      mockedAnalyze.mockImplementationOnce(pending);

      void state().analyzeEmotion('테스트 텍스트');

      expect(state()).toMatchObject({
        currentPage: 'loading',
        isLoading: true,
        progress: 0,
        emotionResult: null,
        error: null,
      });
    });

    it('진행률은 역행하지 않고 메시지는 갱신된다', () => {
      let report: (progress: number, message: string) => void = () => {};
      mockedAnalyze.mockImplementationOnce((_text, onProgress) => {
        report = onProgress;
        return pending();
      });

      void state().analyzeEmotion('테스트 텍스트');
      report(30, '분석 중');
      report(20, '늦게 온 낮은 값');

      expect(state().progress).toBe(30);
      expect(state().loadingMessage).toBe('늦게 온 낮은 값');
    });

    it('성공하면 결과를 저장한다 (페이지 전환은 Loading 애니메이션 몫)', async () => {
      mockedAnalyze.mockResolvedValueOnce(mockResult);

      await state().analyzeEmotion('행복한 텍스트');

      expect(state()).toMatchObject({
        emotionResult: mockResult,
        isLoading: false,
        progress: 100,
        loadingMessage: '완료!',
        currentPage: 'loading',
      });
    });

    it('실패하면 에러를 저장하고 input 페이지로 돌아간다', async () => {
      mockedAnalyze.mockRejectedValueOnce(new Error('분석 실패'));

      await state().analyzeEmotion('테스트 텍스트');

      expect(state()).toMatchObject({
        error: '분석 실패',
        currentPage: 'input',
        isLoading: false,
        progress: 0,
      });
    });

    it('Error 가 아닌 값으로 실패하면 기본 메시지를 사용한다', async () => {
      mockedAnalyze.mockRejectedValueOnce('string rejection');

      await state().analyzeEmotion('테스트 텍스트');

      expect(state().error).toBe(ERROR_MESSAGES.EMOTION_ANALYSIS_FAILED);
    });

    describe('취소 / 경쟁 상태', () => {
      it('SSE 호출에 AbortSignal 을 전달한다', () => {
        mockedAnalyze.mockImplementationOnce(pending);

        void state().analyzeEmotion('테스트 텍스트');

        const signal = mockedAnalyze.mock.calls[0][2];
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal?.aborted).toBe(false);
      });

      it('새 요청을 시작하면 이전 요청의 signal 이 abort 된다', () => {
        mockedAnalyze.mockImplementation(pending);

        void state().analyzeEmotion('첫 번째 요청');
        const firstSignal = mockedAnalyze.mock.calls[0][2];
        void state().analyzeEmotion('두 번째 요청');

        expect(firstSignal?.aborted).toBe(true);
        expect(mockedAnalyze.mock.calls[1][2]?.aborted).toBe(false);
      });

      it('밀려난 이전 요청의 늦은 결과는 최신 상태를 덮어쓰지 않는다', async () => {
        let resolveFirst: (value: EmotionResponse) => void = () => {};
        mockedAnalyze
          .mockImplementationOnce(
            () => new Promise<EmotionResponse>((r) => (resolveFirst = r)),
          )
          .mockImplementationOnce(pending);

        const first = state().analyzeEmotion('첫 번째 요청');
        void state().analyzeEmotion('두 번째 요청');
        resolveFirst(mockResult); // abort 를 무시하고 늦게 도착한 결과
        await first;

        expect(state().emotionResult).toBeNull();
        expect(state().isLoading).toBe(true);
      });

      it('reset() 은 진행 중인 요청을 취소하고, 취소가 에러로 표시되지 않는다', async () => {
        mockedAnalyze.mockImplementationOnce((_t, _p, signal) =>
          abortable(signal),
        );

        const request = state().analyzeEmotion('테스트 텍스트');
        state().reset();
        await request;

        expect(state()).toMatchObject({
          currentPage: 'input',
          isLoading: false,
          error: null,
          abortController: null,
        });
      });

      it('제한 시간을 넘기면 타임아웃 에러와 함께 input 페이지로 돌아간다', async () => {
        vi.useFakeTimers();
        mockedAnalyze.mockImplementationOnce((_t, _p, signal) =>
          abortable(signal),
        );

        const request = state().analyzeEmotion('테스트 텍스트');
        await vi.advanceTimersByTimeAsync(60_000);
        await request;

        expect(state()).toMatchObject({
          error: ERROR_MESSAGES.TIMEOUT_ERROR,
          currentPage: 'input',
          isLoading: false,
        });
      });
    });
  });

  describe('본 곡 이력', () => {
    beforeEach(() => localStorage.clear());

    it('이력이 없으면 두 모드 모두 빈 이력을 보낸다', () => {
      mockedAnalyze.mockImplementationOnce(pending);

      void state().analyzeEmotion('테스트 텍스트');

      expect(mockedAnalyze.mock.calls[0][3]).toEqual({
        immerse: [],
        soothe: [],
      });
    });

    it('받은 응답의 곡 키가 다음 요청의 이력으로 실려 간다', async () => {
      mockedAnalyze
        .mockResolvedValueOnce(
          resultWithKeys(['0000000a', '0000000b'], ['0000000c']),
        )
        .mockImplementationOnce(pending);

      await state().analyzeEmotion('첫 번째 요청');
      void state().analyzeEmotion('두 번째 요청');

      expect(mockedAnalyze.mock.calls[1][3]).toEqual({
        immerse: ['0000000a', '0000000b'],
        soothe: ['0000000c'],
      });
    });

    it('밀려난 요청의 응답은 화면에 안 나오므로 이력에도 남기지 않는다', async () => {
      let resolveFirst: (value: EmotionResponse) => void = () => {};
      mockedAnalyze
        .mockImplementationOnce(
          () => new Promise<EmotionResponse>((r) => (resolveFirst = r)),
        )
        .mockImplementationOnce(pending);

      const first = state().analyzeEmotion('첫 번째 요청');
      void state().analyzeEmotion('두 번째 요청');
      resolveFirst(resultWithKeys(['0000000a'], ['0000000b']));
      await first;

      expect(loadSeen()).toEqual({ immerse: [], soothe: [] });
    });
  });

  describe('clearError', () => {
    it('에러만 초기화한다', async () => {
      mockedAnalyze.mockRejectedValueOnce(new Error('에러'));
      await state().analyzeEmotion('테스트 텍스트');
      expect(state().error).toBe('에러');

      state().clearError();

      expect(state().error).toBeNull();
      expect(state().currentPage).toBe('input');
    });
  });

  describe('reset', () => {
    it('모든 상태를 초기화한다', async () => {
      mockedAnalyze.mockResolvedValueOnce(mockResult);
      await state().analyzeEmotion('테스트 텍스트');

      state().reset();

      expect(state()).toMatchObject({
        currentPage: 'input',
        isLoading: false,
        progress: 0,
        loadingMessage: '',
        emotionResult: null,
        error: null,
        abortController: null,
      });
    });
  });
});
