import { ITunesTrack } from '../../itunes/itunes-track.type';

export type Region = 'korea' | 'pop' | 'jpop';

/** 지역 태그가 붙은 해석 완료 트랙 */
export interface RegionedTrack {
  track: ITunesTrack;
  region: Region;
  match: number;
}

/**
 * 지역 쿼터(기본 6:3:1)로 최종 목록 선정.
 * - 각 지역에서 match 내림차순으로 쿼터만큼 채움
 * - 쿼터를 못 채우면 부족분을 다른 지역 잔여분으로 보충 (곡 수 우선 = A안)
 * - 아티스트 중복 제거 (1아티스트 1곡)
 */
export function selectByRegionQuota(
  candidates: RegionedTrack[],
  quota: Record<Region, number> = { korea: 6, pop: 3, jpop: 1 },
): ITunesTrack[] {
  const total = Object.values(quota).reduce((a, b) => a + b, 0);

  // 지역별 버킷 (match 내림차순)
  const buckets: Record<Region, RegionedTrack[]> = {
    korea: [],
    pop: [],
    jpop: [],
  };
  for (const c of candidates) buckets[c.region].push(c);
  for (const region of Object.keys(buckets) as Region[]) {
    buckets[region].sort((a, b) => b.match - a.match);
  }

  const selected: ITunesTrack[] = [];
  const usedArtists = new Set<string>();
  const usedTrackIds = new Set<number>();

  const take = (rt: RegionedTrack): boolean => {
    const artistKey = rt.track.artistName?.toLowerCase() ?? '';
    if (usedTrackIds.has(rt.track.trackId)) return false;
    if (usedArtists.has(artistKey)) return false; // 1아티스트 1곡
    selected.push(rt.track);
    usedArtists.add(artistKey);
    usedTrackIds.add(rt.track.trackId);
    return true;
  };

  // 1차: 지역별 쿼터만큼 채움
  for (const region of Object.keys(quota) as Region[]) {
    let filled = 0;
    for (const rt of buckets[region]) {
      if (filled >= quota[region]) break;
      if (take(rt)) filled++;
    }
  }

  // 2차: total 미달 시 남은 후보 아무 지역에서나 보충 (A안 — 곡 수 우선)
  if (selected.length < total) {
    const leftovers = candidates
      .filter((c) => !usedTrackIds.has(c.track.trackId))
      .sort((a, b) => b.match - a.match);
    for (const rt of leftovers) {
      if (selected.length >= total) break;
      take(rt);
    }
  }

  return selected;
}
