import { describe, it, expect, vi, afterEach } from 'vitest';
import type { EmotionResponse } from '@artune/shared-types';
import { analyzeEmotionWithProgress, CONNECTION_LOST } from '@/api/emotionApi';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

const encoder = new TextEncoder();
const frame = (event: unknown) => `data: ${JSON.stringify(event)}\n\n`;

/** 이벤트 프레임들을 흘려보내는 스트림 응답 */
function streamResponse(...frames: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const f of frames) controller.enqueue(encoder.encode(f));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function stubFetch(impl: (...args: unknown[]) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('analyzeEmotionWithProgress', () => {
  const result = { emotionLabel: '기쁨' } as EmotionResponse;

  it('글과 이력을 본문에 실어 POST로 보내고, complete 이벤트의 응답을 돌려준다', async () => {
    const fetchMock = stubFetch(async () =>
      streamResponse(frame({ type: 'complete', data: result })),
    );
    const seen = { immerse: ['0000000a'], soothe: ['0000000b'] };
    const controller = new AbortController();

    await expect(
      analyzeEmotionWithProgress(
        '기분 좋아',
        () => {},
        controller.signal,
        seen,
      ),
    ).resolves.toEqual(result);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}${API_ENDPOINTS.ANALYZE_EMOTION_STREAM}`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      text: '기분 좋아',
      seen,
    });
    expect(init.signal).toBe(controller.signal);
  });

  it('progress 이벤트마다 진행률을 알린다', async () => {
    stubFetch(async () =>
      streamResponse(
        frame({ type: 'progress', progress: 10, message: '분석 중' }),
        frame({ type: 'progress', progress: 60, message: '찾는 중' }),
        frame({ type: 'complete', data: result }),
      ),
    );
    const onProgress = vi.fn();

    await analyzeEmotionWithProgress('기분 좋아', onProgress);

    expect(onProgress.mock.calls).toEqual([
      [10, '분석 중'],
      [60, '찾는 중'],
    ]);
  });

  it('error 이벤트는 서버가 보낸 문구로 실패한다', async () => {
    stubFetch(async () =>
      streamResponse(
        frame({ type: 'error', message: '감정 분석에 실패했습니다.' }),
      ),
    );

    await expect(
      analyzeEmotionWithProgress('기분 좋아', () => {}),
    ).rejects.toThrow('감정 분석에 실패했습니다.');
  });

  it('스트림을 열기 전 HTTP 오류(요청 제한 429)는 서버 본문의 문구로 실패한다', async () => {
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({ statusCode: 429, message: '요청이 너무 많아요.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    await expect(
      analyzeEmotionWithProgress('기분 좋아', () => {}),
    ).rejects.toThrow('요청이 너무 많아요.');
  });

  it('complete 없이 스트림이 끝나면 연결 끊김으로 실패한다', async () => {
    stubFetch(async () =>
      streamResponse(
        frame({ type: 'progress', progress: 10, message: '분석 중' }),
      ),
    );

    await expect(
      analyzeEmotionWithProgress('기분 좋아', () => {}),
    ).rejects.toThrow(CONNECTION_LOST);
  });

  it('네트워크 오류는 브라우저 영어 메시지 대신 연결 끊김 문구로 바꾼다', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(
      analyzeEmotionWithProgress('기분 좋아', () => {}),
    ).rejects.toThrow(CONNECTION_LOST);
  });

  it('취소·시간 초과는 바꾸지 않고 그대로 넘긴다', async () => {
    const controller = new AbortController();
    const timeout = new DOMException('시간 초과', 'TimeoutError');
    controller.abort(timeout);
    stubFetch(async () => {
      throw controller.signal.reason;
    });

    await expect(
      analyzeEmotionWithProgress('기분 좋아', () => {}, controller.signal),
    ).rejects.toBe(timeout);
  });
});
