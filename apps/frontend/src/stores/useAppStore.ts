import { create } from 'zustand';
import { analyzeEmotionWithProgress, EmotionResponse } from '@/api/emotionApi';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { loadSeen, recordSeen } from '@/utils/seenHistory';

type Page = 'input' | 'loading' | 'result';

// SSE 전체 제한 시간 (파이프라인 평균 ~10초의 여유분)
const ANALYZE_TIMEOUT_MS = 60_000;

interface AppState {
  currentPage: Page;
  isLoading: boolean;
  progress: number;
  emotionResult: EmotionResponse | null;
  loadingMessage: string;
  error: string | null;
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

    // 1. 초기화 및 로딩 페이지로 전환
    set({
      abortController,
      currentPage: 'loading',
      isLoading: true,
      progress: 0,
      loadingMessage: '감정 분석을 준비하고 있어요...',
      error: null,
      emotionResult: null,
    });

    try {
      // 2. SSE API 호출 (실시간 진행률 업데이트)
      const result = await analyzeEmotionWithProgress(
        text,
        (progress, message) => {
          if (!isCurrent()) return;
          // 현재 progress보다 큰 값일 때만 업데이트 (Math.max 활용)
          set((state) => ({
            progress: Math.max(state.progress, progress), // 진행률 역행 방지
            loadingMessage: message || state.loadingMessage,
          }));
        },
        abortController.signal,
        loadSeen(),
      );
      if (!isCurrent()) return;
      // 화면에 보여 줄 응답만 이력에 남긴다 (밀려난 요청은 바로 위에서 걸러짐)
      recordSeen(result);

      // 3. 완료
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
      set({
        error: timedOut
          ? ERROR_MESSAGES.TIMEOUT_ERROR
          : err instanceof Error
            ? err.message
            : ERROR_MESSAGES.EMOTION_ANALYSIS_FAILED,
        progress: 0,
        isLoading: false,
        currentPage: 'input',
      });
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
      abortController: null,
    });
  },
}));

export default useAppStore;
