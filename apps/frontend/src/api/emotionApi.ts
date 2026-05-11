import { post } from './client';
import { API_ENDPOINTS, API_BASE_URL } from '@/constants/api';
import { Track } from '@/types/track';

interface Playlist {
  modeLabel: string;
  description: string;
  tracks: Track[];
}

export interface EmotionResponse {
  emotionLabel: string;
  description: string;
  artwork: {
    url: string;
    // prompt: string;
  };
  playlists: {
    immerse: Playlist;
    soothe: Playlist;
  };
}

type ProgressCallback = (progress: number, message: string) => void;

export async function analyzeEmotion(text: string): Promise<EmotionResponse> {
  return post<EmotionResponse>(API_ENDPOINTS.ANALYZE_EMOTION, { text });
}

export async function analyzeEmotionWithProgress(
  text: string,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<EmotionResponse> {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${API_ENDPOINTS.ANALYZE_EMOTION_STREAM}?text=${encodeURIComponent(text)}`;

    // EventSource는 credentials를 보내지 않으므로 withCredentials 옵션 없이 생성
    const eventSource = new EventSource(url);

    signal?.addEventListener('abort', () => {
      eventSource.close();
      reject(new DOMException('취소되었습니다.', 'AbortError'));
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          // 진행률 업데이트
          onProgress(data.progress, data.message);
        }
        if (data.type === 'complete') {
          // 완료
          eventSource.close();
          resolve(data.data);
        }
        if (data.type === 'error') {
          // 에러
          eventSource.close();
          reject(new Error(data.message));
        }
      } catch (error) {
        eventSource.close();
        reject(error);
      }
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      const target = event.target as EventSource;
      const errorMessage =
        target.readyState === EventSource.CLOSED
          ? '서버와의 연결이 끊어졌습니다. 다시 시도해주세요.'
          : '감정 분석 중 오류가 발생했습니다.';
      reject(new Error(errorMessage));
    };
  });
}
