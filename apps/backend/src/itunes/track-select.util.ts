import { titleMatches } from './track-title-match.util';
import { artistMatches, featuredArtists } from './track-artist-match.util';

/** 한 스토어에서 본 곡 표기 (US 검색 결과, KR·JP lookup 결과) */
export interface LocalizedName {
  trackName: string;
  artistName: string;
}

export interface TrackCandidate<T> {
  track: T;
  names: LocalizedName[];
  /** 모음집 앨범 수록본 — 원 앨범 수록본이 있으면 그쪽을 고른다 */
  compilation?: boolean;
}

// 보컬이 없거나 원곡을 대신할 수 없는 버전: 요청 곡명에 같은 표기가 없으면 후보에서 뺀다
// mr 뒤 마침표는 제외('Mr. Sunshine'), \b는 ASCII 기준이라 한글·일본어 표기는 그룹 밖에 둔다
const NON_ORIGINAL =
  /\b(instrumental|inst|mr(?!\.)|karaoke|8[- ]?bit|lullaby|lullabies|string quartet|music box|piano ver(sion)?|orgel)\b|オルゴール|반주|연주곡/i;
// 원곡을 대신할 수는 있는 버전: 원곡 후보가 없을 때만 채택 ('Original Mix'는 원곡 표기라 제외)
const ALTERNATE =
  /\b(live|remix|acoustic|sped up|slowed|ver|version|demo|first take)\b|(?<!original )\bmix\b|버스킹/i;

function isUnrequested(
  pattern: RegExp,
  requestedTitle: string,
  names: LocalizedName[],
): boolean {
  return (
    !pattern.test(requestedTitle) &&
    names.some((name) => pattern.test(name.trackName))
  );
}

/**
 * 검색 순위대로 후보를 보며 곡명·아티스트가 모두 맞는 원곡을 고른다.
 * 우선순위: 원 앨범의 원곡 > 모음집의 원곡 > Live·Remix 같은 대체 버전. 모두 없으면 null.
 */
export function selectTrack<T>(
  requested: { artist: string; title: string },
  candidates: TrackCandidate<T>[],
): T | null {
  let compiled: T | null = null;
  let alternate: T | null = null;

  for (const { track, names, compilation } of candidates) {
    const titleOk = names.some((name) =>
      titleMatches(requested.title, name.trackName),
    );
    const artistOk = artistMatches(
      requested.artist,
      names.flatMap((name) => [
        name.artistName,
        ...featuredArtists(name.trackName),
      ]),
    );
    if (!titleOk || !artistOk) continue;
    if (isUnrequested(NON_ORIGINAL, requested.title, names)) continue;

    if (isUnrequested(ALTERNATE, requested.title, names)) {
      alternate ??= track;
      continue;
    }
    if (compilation) {
      compiled ??= track;
      continue;
    }
    return track;
  }

  return compiled ?? alternate;
}
