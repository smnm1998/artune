import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EmotionResponse, Track } from '@artune/shared-types';
import { loadSeen, recordSeen, SEEN_LIMIT } from '@/utils/seenHistory';

const STORAGE_KEY = 'artune:seen';

/** 8자 16진수 곡 키 — 숫자로 만들어 순서를 읽기 쉽게 (key(1) = '00000001') */
const key = (n: number) => n.toString(16).padStart(8, '0');
const keys = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => key(from + i));

const track = (songKey: string): Track => ({
  id: songKey,
  name: '',
  artists: [],
  album: { name: '', images: [] },
  duration_ms: 0,
  preview_url: null,
  appleMusicUrl: '',
  key: songKey,
});

const response = (immerse: string[], soothe: string[]): EmotionResponse => ({
  emotionLabel: '',
  description: '',
  crisis: false,
  artwork: { url: '' },
  playlists: {
    immerse: { modeLabel: '', description: '', tracks: immerse.map(track) },
    soothe: { modeLabel: '', description: '', tracks: soothe.map(track) },
  },
});

const EMPTY = { immerse: [], soothe: [] };

describe('seenHistory', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('저장된 이력이 없으면 두 모드 모두 빈 목록', () => {
    expect(loadSeen()).toEqual(EMPTY);
  });

  it('응답의 곡 키를 모드별로 저장하고, 다음 응답은 뒤에 붙인다', () => {
    recordSeen(response([key(1), key(2)], [key(3)]));
    recordSeen(response([key(4)], [key(5)]));

    expect(loadSeen()).toEqual({
      immerse: [key(1), key(2), key(4)],
      soothe: [key(3), key(5)],
    });
  });

  it(`모드별로 최근 ${SEEN_LIMIT}곡만 남기고 오래된 곡부터 버린다`, () => {
    // 10곡씩 5번 = 50곡 → 처음 10곡(1~10)이 빠진다
    for (let round = 0; round < 5; round++) {
      recordSeen(response(keys(round * 10 + 1, 10), []));
    }

    expect(loadSeen().immerse).toEqual(keys(11, SEEN_LIMIT));
  });

  it('이미 본 곡이 다시 나오면 맨 뒤로 옮긴다 (중복으로 자리를 쓰지 않음)', () => {
    recordSeen(response([key(1), key(2), key(3)], []));
    recordSeen(response([key(2), key(4), key(4)], []));

    expect(loadSeen().immerse).toEqual([key(1), key(3), key(2), key(4)]);
  });

  it('곡 키 형식이 아닌 값은 저장하지 않는다 (키가 없는 이전 서버 응답 포함)', () => {
    const noKey = undefined as unknown as string;
    recordSeen(response([key(1), noKey, 'not-a-key', 'ABCDEF12'], []));

    // 읽을 때도 거르므로, 저장된 값 자체를 본다 — 잘못된 값이 40자리를 차지하지 않게
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual({
      immerse: [key(1)],
      soothe: [],
    });
  });

  it.each(['{깨진 JSON', 'null', '"문자열"', '[1,2]'])(
    '저장값이 깨져 있으면 빈 이력으로 읽는다: %s',
    (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      expect(loadSeen()).toEqual(EMPTY);
    },
  );

  it('저장값 중 형식이 맞는 곡 키만 읽고 40곡을 넘으면 뒤에서 자른다', () => {
    localStorage.setItem(
      STORAGE_KEY,
      // 잘못된 값을 맨 뒤에 둔다 — 앞에 두면 40곡 자르기에 먼저 잘려 거르기를 확인하지 못한다
      JSON.stringify({ immerse: 'aaaaaaaa', soothe: [...keys(1, 45), 42] }),
    );

    expect(loadSeen()).toEqual({ immerse: [], soothe: keys(6, SEEN_LIMIT) });
  });

  it('localStorage를 쓸 수 없어도 오류 없이 이력 없이 동작한다 (사파리 사생활 보호·용량 초과)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('차단', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('용량 초과', 'QuotaExceededError');
    });

    expect(loadSeen()).toEqual(EMPTY);
    expect(() => recordSeen(response([key(1)], []))).not.toThrow();
  });
});
