import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useAppStore from '@/stores/useAppStore';
import { analyzeEmotionWithProgress } from '@/api/emotionApi';
import type { AnalyzeOptions, EmotionResponse } from '@/api/emotionApi';
import type { PlaylistMode } from '@artune/shared-types';
import type { Track } from '@/types/track';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { loadSeen } from '@/utils/seenHistory';

vi.mock('@/api/emotionApi', () => ({
  analyzeEmotionWithProgress: vi.fn(),
}));

const mockedAnalyze = vi.mocked(analyzeEmotionWithProgress);

/** n번째 요청에 넘긴 옵션 (이력·signal·콜백) */
const optionsOf = (call: number) => mockedAnalyze.mock.calls[call][1] ?? {};

const mockResult: EmotionResponse = {
  emotionLabel: '기쁨',
  description: '즐거운 하루였군요.',
  crisis: false,
  artwork: { url: '/artwork/joy.png' },
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

/** 테스트가 직접 흘려보내는 스트림 요청 — 머리말·곡·완료·실패를 차례로. 취소되면 실제처럼 AbortError */
function streamControl() {
  let options: AnalyzeOptions = {};
  let finish: (result: EmotionResponse) => void = () => {};
  let fail: (error: unknown) => void = () => {};
  mockedAnalyze.mockImplementationOnce((_text, given = {}) => {
    options = given;
    return new Promise<EmotionResponse>((resolve, reject) => {
      finish = resolve;
      fail = reject;
      given.signal?.addEventListener('abort', () =>
        reject(new DOMException('취소되었습니다.', 'AbortError')),
      );
    });
  });
  return {
    meta: () => options.onMeta?.(mockResult),
    track: (mode: PlaylistMode, index: number, key: string) =>
      options.onTrack?.(mode, index, trackOf(key)),
    finish: (result: EmotionResponse) => finish(result),
    fail: (error: unknown) => fail(error),
  };
}

const state = () => useAppStore.getState();

/** 지금 결과에 붙어 있는 곡 키 */
const keysOf = (mode: PlaylistMode) =>
  state().emotionResult?.playlists[mode].tracks.map((track) => track.key);

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
        draft: '',
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
      mockedAnalyze.mockImplementationOnce(pending);

      void state().analyzeEmotion('테스트 텍스트');
      optionsOf(0).onProgress?.(30, '분석 중');
      optionsOf(0).onProgress?.(20, '늦게 온 낮은 값');

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

    it('결과 전에 실패하면 보낸 글을 남겨 입력창에 되살릴 수 있게 한다', async () => {
      mockedAnalyze.mockRejectedValueOnce(new Error('요청이 너무 많아요.'));

      await state().analyzeEmotion('오늘 시험을 망쳤어');

      expect(state()).toMatchObject({
        currentPage: 'input',
        draft: '오늘 시험을 망쳤어',
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

        const { signal } = optionsOf(0);
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal?.aborted).toBe(false);
      });

      it('새 요청을 시작하면 이전 요청의 signal 이 abort 된다', () => {
        mockedAnalyze.mockImplementation(pending);

        void state().analyzeEmotion('첫 번째 요청');
        const firstSignal = optionsOf(0).signal;
        void state().analyzeEmotion('두 번째 요청');

        expect(firstSignal?.aborted).toBe(true);
        expect(optionsOf(1).signal?.aborted).toBe(false);
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
        mockedAnalyze.mockImplementationOnce((_t, options) =>
          abortable(options?.signal),
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
        mockedAnalyze.mockImplementationOnce((_t, options) =>
          abortable(options?.signal),
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

      expect(optionsOf(0).seen).toEqual({
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

      expect(optionsOf(1).seen).toEqual({
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

  describe('곡 단위 스트림 (첫 곡부터 화면에)', () => {
    beforeEach(() => localStorage.clear());

    it('머리말은 곡 없는 결과 뼈대로 저장하고, 화면은 로딩에 머문다', () => {
      const stream = streamControl();

      void state().analyzeEmotion('테스트 텍스트');
      stream.meta();

      expect(state()).toMatchObject({
        emotionResult: mockResult,
        currentPage: 'loading',
        isLoading: true,
        progress: 0,
      });
    });

    it('곡은 모드·자리대로 붙고, 첫 곡이 오면 진행률을 채워 로딩 화면을 끝낸다', () => {
      const stream = streamControl();

      void state().analyzeEmotion('테스트 텍스트');
      stream.meta();
      stream.track('immerse', 0, '0000000a');
      expect(state().progress).toBe(100);
      stream.track('immerse', 1, '0000000b');
      stream.track('soothe', 0, '0000000c');

      expect(keysOf('immerse')).toEqual(['0000000a', '0000000b']);
      expect(keysOf('soothe')).toEqual(['0000000c']);
      // 남은 곡을 받는 중 — 결과 화면 전환은 Loading 애니메이션 몫
      expect(state()).toMatchObject({
        isLoading: true,
        currentPage: 'loading',
      });
    });

    it('완료되면 최종 응답으로 바꾸고, 이력은 그때 남긴다', async () => {
      const stream = streamControl();

      const request = state().analyzeEmotion('테스트 텍스트');
      stream.meta();
      stream.track('immerse', 0, '0000000a');
      expect(loadSeen()).toEqual({ immerse: [], soothe: [] });

      const final = resultWithKeys(['0000000a'], ['0000000c']);
      stream.finish(final);
      await request;

      expect(state()).toMatchObject({ emotionResult: final, isLoading: false });
      expect(loadSeen()).toEqual({
        immerse: ['0000000a'],
        soothe: ['0000000c'],
      });
    });

    it('곡을 받은 뒤 실패하면 결과 화면과 받은 곡은 그대로 두고 알림만 띄운다 (이력은 남기지 않음)', async () => {
      const stream = streamControl();

      const request = state().analyzeEmotion('테스트 텍스트');
      stream.meta();
      stream.track('immerse', 0, '0000000a');
      state().setPage('result'); // Loading 애니메이션이 넘긴 뒤
      stream.fail(new Error('감정 분석에 실패했습니다.'));
      await request;

      expect(state()).toMatchObject({
        error: '감정 분석에 실패했습니다.',
        isLoading: false,
        currentPage: 'result',
      });
      expect(keysOf('immerse')).toEqual(['0000000a']);
      expect(loadSeen()).toEqual({ immerse: [], soothe: [] });
    });

    it('곡을 받은 뒤 시간 초과가 나도 받은 곡은 지킨다', async () => {
      vi.useFakeTimers();
      const stream = streamControl();

      const request = state().analyzeEmotion('테스트 텍스트');
      stream.meta();
      stream.track('immerse', 0, '0000000a');
      await vi.advanceTimersByTimeAsync(60_000);
      await request;

      expect(state()).toMatchObject({
        error: ERROR_MESSAGES.TIMEOUT_ERROR,
        isLoading: false,
      });
      expect(keysOf('immerse')).toEqual(['0000000a']);
    });

    it('곡을 받기 전에 실패하면 입력 화면으로 돌아가고, 받아 둔 뼈대도 지운다', async () => {
      const stream = streamControl();

      const request = state().analyzeEmotion('테스트 텍스트');
      stream.meta();
      stream.fail(new Error('감정 분석에 실패했습니다.'));
      await request;

      expect(state()).toMatchObject({
        error: '감정 분석에 실패했습니다.',
        currentPage: 'input',
        emotionResult: null,
        progress: 0,
      });
    });

    it('남은 곡을 받는 중에 처음으로(reset) 돌아가면 스트림을 취소하고, 오류로 띄우지 않는다', async () => {
      const stream = streamControl();

      const request = state().analyzeEmotion('테스트 텍스트');
      stream.meta();
      stream.track('immerse', 0, '0000000a');
      state().reset();
      await request;

      expect(optionsOf(0).signal?.aborted).toBe(true);
      expect(state()).toMatchObject({
        currentPage: 'input',
        error: null,
        emotionResult: null,
      });
    });

    it('밀려난 요청의 늦은 머리말·곡은 최신 상태를 덮어쓰지 않는다', () => {
      const first = streamControl();
      mockedAnalyze.mockImplementationOnce(pending);

      void state().analyzeEmotion('첫 번째 요청');
      void state().analyzeEmotion('두 번째 요청');
      first.meta();
      first.track('immerse', 0, '0000000a');

      expect(state()).toMatchObject({ emotionResult: null, progress: 0 });
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
        draft: '',
        abortController: null,
      });
    });
  });
});
