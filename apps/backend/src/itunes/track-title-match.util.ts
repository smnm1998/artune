/**
 * LLM이 지정한 곡명과 iTunes가 반환한 곡명의 일치 여부 판정
 *
 * 왜 곡명 기반인가 (실측 근거):
 * - iTunes KR 스토어는 서양 아티스트를 한글 음차명으로 반환 (Bill Evans → 빌 에반스,
 *   류이치 사카모토 → 사카모토 류이치). 아티스트명으로 검증하면 오탐이 대량 발생.
 * - 곡명은 대부분 원어/영문 그대로라 검증 신호로 더 안정적.
 * - iTunes는 곡을 못 찾으면 빈 결과가 아니라 엉뚱한 곡을 반환(조용한 실패)하므로,
 *   반환 곡명을 반드시 대조해 폐기해야 함.
 */
export function normalizeTitle(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\(feat[^)]*\)/g, '') // (feat. ...) 제거
    .replace(/feat\..*$/g, '')
    .replace(/[\s'’!:,.\-()&[\]]/g, '');
}

export function titleMatches(requested: string, returned: string): boolean {
  const r = normalizeTitle(requested);
  const g = normalizeTitle(returned);
  if (!r || !g) return false;

  // 완전 포함 (버전 표기 차이 흡수: "Toxicity" ⊂ "Toxicity (Live)")
  if (g.includes(r) || r.includes(g)) return true;

  // 앞부분 일치 (짧은 쪽 기준 70% 접두 일치, 최소 4자)
  const [short, long] = r.length <= g.length ? [r, g] : [g, r];
  if (short.length < 4) return false;
  const prefixLen = Math.max(4, Math.floor(short.length * 0.7));
  return long.startsWith(short.slice(0, prefixLen));
}
