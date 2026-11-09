import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EmotionResponse } from '@artune/shared-types';
import { analyzeEmotionWithProgress, buildStreamUrl } from '@/api/emotionApi';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

const query = (url: string) => new URL(url).searchParams;

describe('buildStreamUrl', () => {
  it('이력이 없으면 text 쿼리만 붙인다', () => {
    const url = buildStreamUrl('오늘 너무 힘들었어');

    expect(
      url.startsWith(`${API_BASE_URL}${API_ENDPOINTS.ANALYZE_EMOTION_STREAM}?`),
    ).toBe(true);
    expect([...query(url).keys()]).toEqual(['text']);
    expect(query(url).get('text')).toBe('오늘 너무 힘들었어');
  });

  it('이력은 모드별 쿼리에 쉼표로 이어 붙인다', () => {
    const url = buildStreamUrl('기분 좋아', {
      immerse: ['0000000a', '0000000b'],
      soothe: ['0000000c'],
    });

    expect(query(url).get('seenImmerse')).toBe('0000000a,0000000b');
    expect(query(url).get('seenSoothe')).toBe('0000000c');
  });

  it('빈 모드는 쿼리에서 뺀다', () => {
    const url = buildStreamUrl('기분 좋아', {
      immerse: [],
      soothe: ['0000000c'],
    });

    expect(query(url).has('seenImmerse')).toBe(false);
    expect(query(url).get('seenSoothe')).toBe('0000000c');
  });

  it('글 속 &·=·+ 문자가 다른 쿼리로 새지 않는다', () => {
    const text = '기분 좋아&seenImmerse=ffffffff+1';
    const url = buildStreamUrl(text);

    expect(query(url).get('text')).toBe(text);
    expect(query(url).has('seenImmerse')).toBe(false);
  });
});

describe('analyzeEmotionWithProgress', () => {
  /** jsdom에는 EventSource가 없어서 주소와 이벤트만 흉내 낸다 */
  class FakeEventSource {
    static last: FakeEventSource;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    constructor(public url: string) {
      FakeEventSource.last = this;
    }
    close() {
      this.closed = true;
    }
    emit(data: unknown) {
      this.onmessage?.({ data: JSON.stringify(data) });
    }
  }

  beforeEach(() => vi.stubGlobal('EventSource', FakeEventSource));
  afterEach(() => vi.unstubAllGlobals());

  it('이력을 실은 주소로 연결하고, complete 이벤트의 응답을 돌려준다', async () => {
    const seen = { immerse: ['0000000a'], soothe: ['0000000b'] };
    const result = { emotionLabel: '기쁨' } as EmotionResponse;

    const request = analyzeEmotionWithProgress(
      '기분 좋아',
      () => {},
      undefined,
      seen,
    );
    const source = FakeEventSource.last;
    source.emit({ type: 'complete', data: result });

    await expect(request).resolves.toEqual(result);
    expect(source.url).toBe(buildStreamUrl('기분 좋아', seen));
    expect(source.closed).toBe(true);
  });
});
