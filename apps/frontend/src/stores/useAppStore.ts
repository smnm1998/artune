import { create } from 'zustand';
import type { PlaylistMode } from '@artune/shared-types';
import { analyzeEmotionWithProgress, EmotionResponse } from '@/api/emotionApi';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type { Track } from '@/types/track';
import { loadSeen, recordSeen } from '@/utils/seenHistory';

type Page = 'input' | 'loading' | 'result';

// SSE 전체 제한 시간 (파이프라인 평균 ~10초의 여유분)
const ANALYZE_TIMEOUT_MS = 60_000;

/** 받은 곡을 그 모드의 index 자리에 넣는다 — 서버가 모드별 최종 순서대로 보내서 빈 칸은 생기지 않는다 */
function withTrack(
  result: EmotionResponse,
  mode: PlaylistMode,
  index: number,
  track: Track,
): EmotionResponse {
  const playlist = result.playlists[mode];
  const tracks = [...playlist.tracks];
  tracks[index] = track;
  return {
    ...result,
    playlists: { ...result.playlists, [mode]: { ...playlist, tracks } },
  };
}

interface AppState {
  currentPage: Page;
  /** 요청이 끝나기 전(첫 곡이 와서 결과 화면으로 넘어간 뒤에도 남은 곡을 받는 동안 true) */
  isLoading: boolean;
  progress: number;
  /** 결과 — 스트림 중에는 머리말(meta)에 받은 곡을 붙여 가는 중간 상태, 끝나면 최종 응답 */
  emotionResult: EmotionResponse | null;
  loadingMessage: string;
  error: string | null;
  /** 보낸 글 — 결과 전에 실패해 입력 화면으로 돌아오면 입력창에 되살린다. 메모리에만 두고 저장하지 않는다 */
  draft: string;
  abortController: AbortController | null;
  setPage: (page: Page) => void;
  analyzeEmotion: (text: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const useAppStore = create<AppState>((set, get) => ({
  // 상태
  currentPage: 'input',
  isLoading: false,
  progress: 0,
  emotionResult: null,
  loadingMessage: '',
  error: null,
  draft: '',
  abortController: null,

  setPage: (page) => set({ currentPage: page }),

  analyzeEmotion: async (text) => {
    get().abortController?.abort();
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () =>
        abortController.abort(new DOMException('시간 초과', 'TimeoutError')),
      ANALYZE_TIMEOUT_MS,
    );
    // 새 요청/reset 에 밀려났다면 false — 늦게 도착한 응답이 최신 상태를 덮어쓰는 것을 막는다
    const isCurrent = () => get().abortController === abortController;
    // 곡을 하나라도 받았으면 결과 화면으로 넘어간(넘어가는) 중 — 도중에 실패해도 받은 곡은 지킨다
    let receivedTrack = false;

    // 1. 초기화 및 로딩 페이지로 전환
    set({
      abortController,
      currentPage: 'loading',
      isLoading: true,
      progress: 0,
      loadingMessage: '감정 분석을 준비하고 있어요...',
      error: null,
      emotionResult: null,
      draft: text,
    });

    try {
      // 2. 스트림 호출 — 진행률, 머리말(감정·공감 문구·아트워크), 곡이 차례로 온다
      const result = await analyzeEmotionWithProgress(text, {
        seen: loadSeen(),
        signal: abortController.signal,
        onProgress: (progress, message) => {
          if (!isCurrent()) return;
          // 현재 progress보다 큰 값일 때만 업데이트 (Math.max 활용)
          set((state) => ({
            progress: Math.max(state.progress, progress), // 진행률 역행 방지
            loadingMessage: message || state.loadingMessage,
          }));
        },
        // 곡 없는 결과 뼈대 — 화면은 첫 곡이 올 때까지 로딩에 머문다
        onMeta: (meta) => {
          if (!isCurrent()) return;
          set({ emotionResult: meta });
        },
        onTrack: (mode, index, track) => {
          if (!isCurrent()) return;
          receivedTrack = true;
          set((state) => ({
            emotionResult:
              state.emotionResult &&
              withTrack(state.emotionResult, mode, index, track),
            // 로딩 화면은 첫 곡까지 — 진행률을 채우면 Loading 애니메이션이 결과 화면으로 넘긴다
            progress: 100,
          }));
        },
      });
      if (!isCurrent()) return;
      // 화면에 보여 줄 응답만 이력에 남긴다 (밀려난 요청은 바로 위에서 걸러짐)
      recordSeen(result);

      // 3. 완료 — 받아 온 곡과 같은 최종 응답으로 바꾼다
      set({
        progress: 100,
        loadingMessage: '완료!',
        emotionResult: result,
        isLoading: false,
      });
      // 페이지 전환은 Loading 컴포넌트의 애니메이션 완료 후 onComplete에서 처리
    } catch (err) {
      // 밀려난(교체·reset) 요청의 에러는 무시. 단, 타임아웃은 현재 요청의 실패이므로 아래로 진행
      if (!isCurrent()) return;
      const timedOut = abortController.signal.reason?.name === 'TimeoutError';
      const error = timedOut
        ? ERROR_MESSAGES.TIMEOUT_ERROR
        : err instanceof Error
          ? err.message
          : ERROR_MESSAGES.EMOTION_ANALYSIS_FAILED;
      set(
        receivedTrack
          ? // 결과 화면과 받은 곡은 그대로, 알림만. 끝까지 오지 않은 응답이라 이력에는 남기지 않는다
            { error, isLoading: false }
          : {
              error,
              progress: 0,
              isLoading: false,
              currentPage: 'input',
              emotionResult: null,
            },
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => {
    get().abortController?.abort();
    set({
      currentPage: 'input',
      isLoading: false,
      progress: 0,
      loadingMessage: '',
      emotionResult: null,
      error: null,
      draft: '',
      abortController: null,
    });
  },
}));

export default useAppStore;
