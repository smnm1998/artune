/** 사용자 이력 — 모드별로 최근 본 곡 수 (👤 11/5 결정, 화면 10곡 기준 약 4번 사용분) */
export const HISTORY_LIMIT = 40;

export interface FreshnessContext {
  /** 전체 머리 곡 (노출 기록) */
  heads: ReadonlySet<string>;
  /** 이 사람이 이 모드에서 최근 본 곡 */
  seen: ReadonlySet<string>;
}

/**
 * 해석 전 후순위: 0 처음 보는 곡 → 1 전체 머리 곡 → 2 이 사람이 본 곡.
 * - 곡을 빼지 않고 순서만 바꾼다. 뒤로 민 곡은 앞의 곡이 해석 실패·지역 쿼터·1아티스트 1곡으로 모자랄 때만 화면에 들어간다
 * - 프롬프트로 금지하면 모델이 다음 뻔한 곡으로 옮겨 가지만(11/5 측정), 순서만 바꾸면 모델이 이미 고른 꼬리 곡이 자리를 채운다
 * - 머리 곡이면서 본 곡이면 본 곡 쪽(맨 뒤)
 */
export function freshnessTier(
  key: string,
  { heads, seen }: FreshnessContext,
): 0 | 1 | 2 {
  return seen.has(key) ? 2 : heads.has(key) ? 1 : 0;
}

/**
 * 후순위대로 정렬 — 같은 묶음 안에서는 LLM이 고른 순서를 지킨다.
 * 운영(servePicksStream)은 곡이 도착할 때 freshnessTier로 순위를 매기고, 다 모인 목록을 정렬하는 이 함수는 측정 재생(probe-picks)이 쓴다
 */
export function orderByFreshness<T extends { key: string }>(
  songs: readonly T[],
  context: FreshnessContext,
): T[] {
  return [...songs].sort(
    (a, b) => freshnessTier(a.key, context) - freshnessTier(b.key, context),
  );
}
