import { API_ENDPOINTS, API_BASE_URL } from '@/constants/api';
import type { EmotionResponse, EmotionStreamEvent } from '@artune/shared-types';

export type { EmotionResponse };

type ProgressCallback = (progress: number, message: string) => void;

export async function analyzeEmotionWithProgress(
  text: string,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<EmotionResponse> {
  return new Promise((resolve, reject) => {
    // 이미 abort 된 signal 은 'abort' 이벤트가 다시 발생하지 않으므로 직접 확인
    if (signal?.aborted) {
      reject(new DOMException('취소되었습니다.', 'AbortError'));
      return;
    }

    const url = `${API_BASE_URL}${API_ENDPOINTS.ANALYZE_EMOTION_STREAM}?text=${encodeURIComponent(text)}`;

    // EventSource는 credentials를 보내지 않으므로 withCredentials 옵션 없이 생성
    const eventSource = new EventSource(url);

    const handleAbort = () => {
      cleanup();
      reject(new DOMException('취소되었습니다.', 'AbortError'));
    };
    // 종료 경로가 여럿이라 한 곳에서 정리: 연결 닫기 + abort 리스너 해제
    const cleanup = () => {
      eventSource.close();
      signal?.removeEventListener('abort', handleAbort);
    };

    signal?.addEventListener('abort', handleAbort, { once: true });

    eventSource.onmessage = (event) => {
      try {
        const data: EmotionStreamEvent = JSON.parse(event.data);

        if (data.type === 'progress') {
          // 진행률 업데이트
          onProgress(data.progress, data.message);
        }
        if (data.type === 'complete') {
          // 완료
          cleanup();
          resolve(data.data);
        }
        if (data.type === 'error') {
          // 에러
          cleanup();
          reject(new Error(data.message));
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    eventSource.onerror = () => {
      cleanup();
      // error 이벤트는 원인을 알려주지 않는다. (원본은 close() 뒤에 readyState를 읽어 항상 CLOSED였음)
      reject(new Error('서버와의 연결이 끊어졌습니다. 다시 시도해주세요.'));
    };
  });
}
