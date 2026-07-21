import { ITunesTrack } from 'src/itunes/itunes-track.type';

/**
 * OpenAI 프롬프트의 허용 장르 → iTunes primaryGenreName 라벨 조각 매핑
 *
 * 주의 (실측 기반):
 * - country=kr 검색은 라벨이 한국어로 반환됨 (Bill Evans → '재즈', 백예린 → '싱어송라이터')
 *   → 영어/한국어 별칭을 함께 등록해야 함
 * - 라벨이 거칠고 일관성이 낮음 (김광석 → 'K-Pop', Nick Drake → 'Rock')
 *   → 엄격 매칭이 아닌 substring 포함 기반의 느슨한 매칭만 수행
 */
const GENRE_ALIASES: Record<string, string[]> = {
  pop: ['pop', '팝'],
  dance: ['dance', 'electronic', 'house', '댄스', '일렉트로', 'k-pop'],
  'k-pop': ['k-pop'],
  'k-hop': ['k-pop', 'hip-hop', 'rap', '힙합', '랩'],
  'k-indie': ['k-pop', 'indie', 'alternative', '인디', '얼터너티브'],
  'k-rock': ['k-pop', 'rock', '록', '락'],
  'j-pop': ['j-pop', 'anime', '제이팝'],
  'hip hop': ['hip-hop', 'rap', '힙합', '랩'],
  rock: ['rock', 'alternative', 'punk', 'metal', '록', '락', '메탈'],
  electronic: ['electronic', 'dance', 'ambient', '일렉트로', '댄스'],
  house: ['house', 'dance', 'electronic', '하우스', '댄스'],
  edm: ['dance', 'electronic', 'house', '댄스', '일렉트로'],
  funk: ['funk', 'disco', 'r&b', '펑크', '디스코'],
  punk: ['punk', 'rock', '펑크', '록'],
  'r&b': ['r&b', 'soul', '알앤비', '소울'],
  soul: ['soul', 'r&b', '소울', '알앤비'],
  'indie pop': ['indie', 'alternative', 'pop', '인디', '얼터너티브'],
  disco: ['disco', 'dance', 'funk', '디스코', '댄스'],
  alternative: ['alternative', 'indie', 'rock', '얼터너티브', '인디'],
  'indie rock': ['indie', 'alternative', 'rock', '인디', '얼터너티브'],
  'synth-pop': ['pop', 'electronic', 'new wave', '팝', '일렉트로'],
  'dream pop': ['alternative', 'indie', 'shoegaze', '인디', '얼터너티브'],
  shoegaze: ['alternative', 'indie', 'rock', '인디', '얼터너티브'],
  'city pop': ['j-pop', 'city pop', 'pop', '시티'],
  folk: ['folk', 'singer/songwriter', 'americana', '포크', '싱어송라이터'],
  jazz: ['jazz', 'bossa', '재즈', '보사'],
  blues: ['blues', '블루스'],
  classical: ['classical', 'instrumental', '클래식', '연주'],
  'singer-songwriter': ['singer/songwriter', 'folk', '싱어송라이터', '포크'],
  acoustic: ['acoustic', 'singer/songwriter', 'folk', '어쿠스틱', '싱어송라이터', '포크'],
  'acoustic pop': ['acoustic', 'singer/songwriter', 'folk', 'pop', '어쿠스틱', '싱어송라이터'],
  piano: ['instrumental', 'classical', 'new age', '클래식', '연주', '뉴에이지'],
  ambient: ['ambient', 'electronic', 'new age', '일렉트로', '뉴에이지'],
  'lo-fi': ['lo-fi', 'hip-hop', 'electronic', 'instrumental', '힙합', '일렉트로'],
  'bossa nova': ['bossa', 'jazz', 'brazilian', 'mpb', '보사', '재즈'],
};

export function matchesGenres(track: ITunesTrack, genres: string[]): boolean {
  const label = track.primaryGenreName?.toLowerCase();
  if (!label) return false;

  return genres.some((genre) => {
    const aliases = GENRE_ALIASES[genre.toLowerCase()] ?? [genre.toLowerCase()];
    return aliases.some((alias) => label.includes(alias));
  });
}

/**
 * 장르 매칭 트랙을 앞에, 비매칭을 뒤에 배치 (소프트 필터)
 * 매칭이 부족해도 결과를 비우지 않고 비매칭으로 보충되도록 순서만 조정한다.
 */
export function preferMatchingGenres(
  tracks: ITunesTrack[],
  genres: string[],
): ITunesTrack[] {
  if (genres.length === 0) return tracks;

  const matched: ITunesTrack[] = [];
  const unmatched: ITunesTrack[] = [];
  for (const track of tracks) {
    (matchesGenres(track, genres) ? matched : unmatched).push(track);
  }
  return [...matched, ...unmatched];
}
