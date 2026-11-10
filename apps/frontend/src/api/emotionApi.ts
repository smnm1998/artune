import { API_ENDPOINTS, API_BASE_URL } from '@/constants/api';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type {
  AnalyzeRequest,
  EmotionResponse,
  EmotionStreamEvent,
  SeenHistory,
} from '@artune/shared-types';
import { readSseEvents } from './sse';

export type { EmotionResponse };

type ProgressCallback = (progress: number, message: string) => void;

export const CONNECTION_LOST =
  '서버와의 연결이 끊어졌습니다. 다시 시도해주세요.';

/** 스트림을 열기 전 HTTP 오류(빈 글 400·요청 제한 429 등)의 안내 문구 — Nest 오류 본문의 message를 쓴다 */
async function httpErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;
    if (typeof message === 'string' && message) return message;
  } catch {
    // 본문이 JSON이 아니면 기본 문구
  }
  return ERROR_MESSAGES.EMOTION_ANALYSIS_FAILED;
}

/**
 * 감정 분석 + 추천 (POST 스트리밍). 글과 이력은 본문으로 보내고, 진행률·결과는 SSE 형식으로 흘러온다.
 * - 취소는 signal로: fetch와 본문 읽기가 함께 멈추고 연결이 닫힌다
 * - 취소·시간 초과 오류는 그대로 넘긴다(스토어가 signal.reason으로 구분). 그 밖의 네트워크 실패는
 *   브라우저 영어 메시지(Failed to fetch) 대신 연결 끊김 문구로 바꾼다
 */
export async function analyzeEmotionWithProgress(
  text: string,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
  seen?: SeenHistory,
): Promise<EmotionResponse> {
  const request: AnalyzeRequest = { text, seen };
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.ANALYZE_EMOTION_STREAM}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal,
      },
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(CONNECTION_LOST);
  }
  if (!response.ok) throw new Error(await httpErrorMessage(response));
  if (!response.body) throw new Error(CONNECTION_LOST);

  let failure: string | null = null;
  try {
    for await (const event of readSseEvents<EmotionStreamEvent>(
      response.body,
    )) {
      if (event.type === 'progress') onProgress(event.progress, event.message);
      if (event.type === 'complete') return event.data;
      if (event.type === 'error') {
        failure = event.message;
        break;
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(CONNECTION_LOST);
  }
  // error 이벤트면 서버 문구로, complete 없이 끝났으면 연결 끊김으로
  throw new Error(failure ?? CONNECTION_LOST);
}
