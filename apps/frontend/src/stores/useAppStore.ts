import { create } from 'zustand';
import type { PlaylistMode } from '@artune/shared-types';
import { analyzeEmotionStream, EmotionResponse } from '@/api/emotionApi';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type { Track } from '@/types/track';
import { loadSeen, recordSeen } from '@/utils/seenHistory';

type Page = 'input' | 'result';

// 스트림 전체 제한 시간 — 끝까지 보통 10초 안쪽
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
  /** 요청이 끝나기 전 true — 결과 화면으로 넘어간 뒤에도 곡을 받는 동안 (빈 칸은 '못 찾음'이 아니라 '고르는 중') */
  isLoading: boolean;
  /** 결과 — 스트림 중에는 머리말(meta)에 받은 곡을 붙여 가는 중간 상태(머리말 전에는 null), 끝나면 최종 응답 */
  emotionResult: EmotionResponse | null;
  error: string | null;
  /** 보낸 글 — 결과 전에 실패해 입력 화면으로 돌아오면 입력창에 되살린다. 메모리에만 두고 저장하지 않는다 */
  draft: string;
  abortController: AbortController | null;
  analyzeEmotion: (text: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'input',
  isLoading: false,
  emotionResult: null,
  error: null,
  draft: '',
  abortController: null,

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
    // 곡을 하나라도 받았으면 도중에 실패해도 받은 곡은 지킨다
    let receivedTrack = false;

    // 입력 화면에 머문 채 요청한다 — 스트림이 열려야(HTTP 200) 결과 화면으로. 400·429는 입력 화면에서 토스트로 끝난다
    set({
      abortController,
      isLoading: true,
      error: null,
      emotionResult: null,
      draft: text,
    });

    try {
      // 열림 → 머리말(감정·공감 문구·아트워크) → 곡이 차례로 온다
      const result = await analyzeEmotionStream(text, {
        seen: loadSeen(),
        signal: abortController.signal,
        // 결과 화면으로 — 머리말·곡이 오기 전까지는 스켈레톤
        onOpen: () => {
          if (!isCurrent()) return;
          set({ currentPage: 'result' });
        },
        // 곡 없는 결과 뼈대 — 머리말 스켈레톤이 채워진다
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
          }));
        },
      });
      if (!isCurrent()) return;
      // 화면에 보여 줄 응답만 이력에 남긴다 (밀려난 요청은 바로 위에서 걸러짐)
      recordSeen(result);

      // 완료 — 받아 온 곡과 같은 최종 응답으로 바꾼다 (남은 스켈레톤 칸이 사라진다)
      set({ emotionResult: result, isLoading: false });
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
          : // 곡 없이 실패하면 입력 화면으로 — 보낸 글(draft)이 입력창에 되살아난다
            {
              error,
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
      emotionResult: null,
      error: null,
      draft: '',
      abortController: null,
    });
  },
}));

export default useAppStore;
