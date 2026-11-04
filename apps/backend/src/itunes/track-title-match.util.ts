/**
 * LLM이 지정한 곡명과 iTunes가 반환한 곡명의 일치 여부 판정
 *
 * - iTunes는 곡을 못 찾으면 빈 결과가 아니라 엉뚱한 곡을 반환(조용한 실패)하므로,
 *   반환 곡명을 반드시 대조해 폐기해야 함.
 * - 스토어마다 곡명이 현지화된다(US 'Through the Night' ↔ KR '밤편지').
 *   호출부(track-select.util)가 US·KR·JP 표기를 모두 대조한다.
 */
// 앞에 붙은 괄호 부제: '(They Long To Be) Close To You' ↔ 'Close to You'
const LEADING_PAREN = /^\s*[([][^)\]]*[)\]]\s*/;
const NON_TITLE_CHAR = /[^\p{L}\p{N}]|\p{Lm}/gu;

export function normalizeTitle(value: string): string {
  return (value ?? '')
    .normalize('NFKC') // 전각 괄호 '奏（かなで）' → '奏(かなで)'
    .toLowerCase()
    .replace(/\(feat[^)]*\)/g, '') // (feat. ...) 제거
    .replace(/feat\..*$/g, '')
    .replace(NON_TITLE_CHAR, '');
}

export function titleMatches(requested: string, returned: string): boolean {
  const withoutSubtitle = (value: string) =>
    (value ?? '').normalize('NFKC').replace(LEADING_PAREN, '');
  return (
    normalizedMatches(requested, returned) ||
    normalizedMatches(withoutSubtitle(requested), withoutSubtitle(returned))
  );
}

function normalizedMatches(requested: string, returned: string): boolean {
  const r = normalizeTitle(requested);
  const g = normalizeTitle(returned);
  if (!r || !g) return false;

  const [short, long] = r.length <= g.length ? [r, g] : [g, r];
  // 앞부분 일치: 버전·부제 표기 차이 흡수 ("Toxicity" ⊂ "Toxicity (Live)", "괴짜" ⊂ "괴짜 (Freak)")
  if (long.startsWith(short)) return true;
  // 중간 포함은 절반 이상 겹칠 때만: 긴 곡명 속 짧은 단어("Woman")와의 오매칭 방지
  return long.includes(short) && short.length * 2 >= long.length;
}
