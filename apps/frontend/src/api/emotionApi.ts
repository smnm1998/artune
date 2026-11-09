import { API_ENDPOINTS, API_BASE_URL } from '@/constants/api';
import type {
  EmotionResponse,
  EmotionStreamEvent,
  SeenHistory,
} from '@artune/shared-types';

export type { EmotionResponse };

type ProgressCallback = (progress: number, message: string) => void;

/**
 * SSE(GET) 요청 주소. 이력은 쿼리 seenImmerse·seenSoothe에 쉼표로 잇고, 빈 모드는 빼서 주소를 줄인다.
 * (4일차 POST 전환 때 본문 seen으로 옮긴다)
 */
export function buildStreamUrl(text: string, seen?: SeenHistory): string {
  const params = new URLSearchParams({ text });
  if (seen?.immerse.length) params.set('seenImmerse', seen.immerse.join(','));
  if (seen?.soothe.length) params.set('seenSoothe', seen.soothe.join(','));
  return `${API_BASE_URL}${API_ENDPOINTS.ANALYZE_EMOTION_STREAM}?${params}`;
}

export async function analyzeEmotionWithProgress(
  text: string,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
  seen?: SeenHistory,
): Promise<EmotionResponse> {
  return new Promise((resolve, reject) => {
    // 이미 abort 된 signal 은 'abort' 이벤트가 다시 발생하지 않으므로 직접 확인
    if (signal?.aborted) {
      reject(new DOMException('취소되었습니다.', 'AbortError'));
      return;
    }

    // EventSource는 credentials를 보내지 않으므로 withCredentials 옵션 없이 생성
    const eventSource = new EventSource(buildStreamUrl(text, seen));

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
