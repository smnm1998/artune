/** 사용자 이력 — 모드별로 최근 본 곡 수 (👤 11/5 결정, 화면 10곡 기준 약 4번 사용분) */
export const HISTORY_LIMIT = 40;

/**
 * 해석 전 후순위: 처음 보는 곡 → 전체 머리 곡 → 이 사람이 본 곡. 같은 묶음 안에서는 LLM이 고른 순서를 지킨다.
 * - 곡을 빼지 않고 순서만 바꾼다. 뒤로 민 곡은 앞의 곡이 해석 실패·지역 쿼터·1아티스트 1곡으로 모자랄 때만 화면에 들어간다
 * - 프롬프트로 금지하면 모델이 다음 뻔한 곡으로 옮겨 가지만(11/5 측정), 순서만 바꾸면 모델이 이미 고른 꼬리 곡이 자리를 채운다
 * - 머리 곡이면서 본 곡이면 본 곡 쪽(맨 뒤)
 */
export function orderByFreshness<T extends { key: string }>(
  songs: readonly T[],
  { heads, seen }: { heads: ReadonlySet<string>; seen: ReadonlySet<string> },
): T[] {
  const tier = (song: T) =>
    seen.has(song.key) ? 2 : heads.has(song.key) ? 1 : 0;
  return [...songs].sort((a, b) => tier(a) - tier(b));
}
