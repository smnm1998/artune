import type {
  EmotionResponse,
  PlaylistMode,
  SeenHistory,
} from '@artune/shared-types';

/**
 * 이 브라우저에서 최근 본 곡 키 — 모드별로 오래된 곡이 앞, 최근 곡이 뒤.
 * 다음 요청 때 서버에 보내면 서버가 이 곡들을 화면 순서에서 뒤로 미룬다(지우지는 않음).
 * 감정 글은 저장하지 않는다. 곡 키는 곡명 해시라 곡명도 남지 않는다.
 */
const STORAGE_KEY = 'artune:seen';

/** 모드별 보관 곡 수 — 서버 HISTORY_LIMIT과 같은 값 (서버도 뒤에서 40개만 읽는다) */
export const SEEN_LIMIT = 40;

const MODES: readonly PlaylistMode[] = ['immerse', 'soothe'];

/** 서버 songKey 형식 (sha256 앞 8자) — 서버 EmotionService.parseSeen과 같은 규칙 */
const SONG_KEY = /^[0-9a-f]{8}$/;

const isSongKey = (value: unknown): value is string =>
  typeof value === 'string' && SONG_KEY.test(value);

const emptyHistory = (): SeenHistory => ({ immerse: [], soothe: [] });

/**
 * 이미 본 곡이 다시 나오면 맨 뒤(가장 최근)로 옮긴다 — 중복으로 40자리를 낭비하지 않게.
 * 넘치면 오래된 앞쪽부터 버린다.
 */
export function appendSeen(
  history: readonly string[],
  keys: readonly string[],
): string[] {
  // Set은 넣은 순서를 지킨다 — 응답 안의 순서 그대로, 중복만 빠진다
  const incoming = new Set(keys.filter(isSongKey));
  return [...history.filter((key) => !incoming.has(key)), ...incoming].slice(
    -SEEN_LIMIT,
  );
}

/** 저장된 이력. 읽을 수 없거나(사파리 사생활 보호 등) 깨져 있으면 빈 이력 */
export function loadSeen(): SeenHistory {
  const history = emptyHistory();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return history;
    // 객체가 아닌 값('null'·문자열·숫자)이어도 parsed?.[mode]는 undefined라 빈 목록이 된다
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    for (const mode of MODES) {
      const list = parsed?.[mode];
      if (Array.isArray(list)) {
        history[mode] = list.filter(isSongKey).slice(-SEEN_LIMIT);
      }
    }
  } catch {
    // 이력 없이 동작 — 추천은 그대로 되고 반복만 덜 피한다
  }
  return history;
}

/** 화면에 보여 준 응답의 곡 키를 모드별 이력 뒤에 붙인다 */
export function recordSeen(response: EmotionResponse): void {
  const history = loadSeen();
  for (const mode of MODES) {
    history[mode] = appendSeen(
      history[mode],
      response.playlists[mode].tracks.map((track) => track.key),
    );
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // 용량 초과·저장 차단 — 이번 응답은 이력에 못 남지만 화면에는 영향 없음
  }
}
