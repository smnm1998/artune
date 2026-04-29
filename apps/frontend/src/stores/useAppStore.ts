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
  setPage: (page: Page) => void;
  analyzeEmotion: (text: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * 앱 전체 상태를 관리하는 Zustand Store
 *
 * @typedef {Object} AppState
 * @property {('input'|'loading'|'result')} currentPage - 현재 페이지
 * @property {boolean} isLoading - 로딩 중 여부
 * @property {number} progress - 로딩 진행률 (0-100)
 * @property {Object|null} emotionResult - 감정 분석 결과
 * @property {string|null} error - 에러 메시지
 *
 * @typedef {Object} AppActions
 * @property {(page: string) => void} setPage - 페이지 변경
 * @property {(text: string) => Promise<void>} analyzeEmotion - 감정 분석 실행
 * @property {() => void} clearError - 에러 초기화
 * @property {() => void} reset - 전체 상태 초기화
 */
const useAppStore = create<AppState>((set) => ({
  // 상태
  currentPage: 'input',
  isLoading: false,
  progress: 0,
  emotionResult: null,
  loadingMessage: '',
  error: null,

  setPage: (page) => set({ currentPage: page }),

  analyzeEmotion: async (text) => {
    // 1. 초기화 및 로딩 페이지로 전환
    set({
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

  /**
   * 에러 메시지 초기화
   */
  clearError: () => set({ error: null }),

  /**
   * 전체 상태 초기화 (다시하기)
   */
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
