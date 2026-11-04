/**
 * LLM이 지정한 아티스트와 iTunes 후보 아티스트의 일치 여부 판정
 *
 * 왜 아티스트까지 대조하나 (11/3 실측):
 * - 곡명만 대조하면 같은 곡명의 커버·MR·자장가 버전이 통과한다 (모델당 오매칭 40~48건).
 * - 스토어마다 아티스트명이 현지화되므로(BTS ↔ 방탄소년단, Hikaru Utada ↔ 宇多田ヒカル)
 *   호출부가 US·KR·JP 표기를 모두 넘기고, 그중 하나와 맞으면 일치로 본다.
 * - 한글 음차(트와이스 ↔ TWICE)는 대조하지 않는다 — LLM 프롬프트에서 공식 표기를 요구한다.
 */

// 공동·피처링 아티스트 구분자 ('TAEYEON & JONGHYUN', '백현 (BAEKHYUN)')
const SEPARATOR =
  /\s*(?:,|&|×|\/|\(|\)|\[|\]|\bx\b|\bfeat\.?|\bft\.?|\bwith\b|\band\b)\s*/i;
// 곡명 속 피처링 표기 ('Uptown Funk (feat. Bruno Mars)'의 아티스트 필드는 Mark Ronson)
const FEATURING = /[([](?:feat\.?|ft\.?|with)\s+([^)\]]+)[)\]]/gi;
// 'The Black Eyed Peas' ↔ 'Black Eyed Peas'
const LEADING_THE = /^\s*the\s+/;
// 문자·숫자만 남긴다. 'ʻ'(Kamakawiwoʻole)는 유니코드상 수식 문자(Lm)라 따로 뺀다
const NON_NAME_CHAR = /[^\p{L}\p{N}]|\p{Lm}/gu;

export function normalizeArtist(value: string): string {
  return (value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(LEADING_THE, '')
    .replace(NON_NAME_CHAR, '');
}

// 어순 무관 비교용 키 ('Baek Yerin' ↔ 'Yerin Baek')
function sortedWordsKey(value: string): string {
  return normalizeArtist(
    value
      .normalize('NFKC')
      .toLowerCase()
      .split(/[\s-]+/)
      .sort()
      .join(''),
  );
}

function artistKeys(name: string): string[] {
  const full = name ?? '';
  return [full, ...full.split(SEPARATOR)]
    .flatMap((part) => [normalizeArtist(part), sortedWordsKey(part)])
    .filter(Boolean);
}

export function featuredArtists(trackName: string): string[] {
  return [...(trackName ?? '').matchAll(FEATURING)].map((match) => match[1]);
}

export function artistMatches(
  requested: string,
  candidates: string[],
): boolean {
  const wanted = new Set(artistKeys(requested));
  return candidates.some((name) =>
    artistKeys(name).some((key) => wanted.has(key)),
  );
}
