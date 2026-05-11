import { create } from 'zustand';
import { analyzeEmotionWithProgress, EmotionResponse } from '@/api/emotionApi';
import { ERROR_MESSAGES } from '@/constants/errorMessages';

type Page = 'input' | 'loading' | 'result';

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
          // 현재 progress보다 큰 값일 때만 업데이트 (Math.max 활용)
          set((state) => ({
            progress: Math.max(state.progress, progress), // 진행률 역행 방지
            loadingMessage: message || state.loadingMessage,
          }));
        },
      );

      // 3. 완료
      set({
        progress: 100,
        loadingMessage: '완료!',
        emotionResult: result,
        isLoading: false,
      });
      // 페이지 전환은 Loading 컴포넌트의 애니메이션 완료 후 onComplete에서 처리
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      set({
        error:
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.EMOTION_ANALYSIS_FAILED,
        progress: 0,
        isLoading: false,
        currentPage: 'input',
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      currentPage: 'input',
      isLoading: false,
      progress: 0,
      emotionResult: null,
      error: null,
    }),
}));

export default useAppStore;
