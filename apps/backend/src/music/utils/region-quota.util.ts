import { ITunesTrack } from '../../itunes/itunes-track.type';

export type Region = 'korea' | 'pop' | 'jpop';

/** 지역 태그가 붙은 해석 완료 트랙 */
export interface RegionedTrack {
  track: ITunesTrack;
  region: Region;
  match: number;
}

export const REGION_QUOTA: Record<Region, number> = {
  korea: 6,
  pop: 3,
  jpop: 1,
};

/**
 * 처음 보는 곡이 모자란 지역의 자리를 다른 지역의 처음 보는 곡으로 채우는 최대 수 (👤 11/6).
 * 1이면 화면 한국 곡은 최소 5곡이다(한국 후보가 있을 때). D4 재생에서 같은 사람 심취 반복 5.06 → 4.31
 */
export const FRESH_BORROW_LIMIT = 1;

/**
 * 지역 쿼터(기본 6:3:1)로 최종 목록 선정.
 * - 각 지역에서 match 내림차순으로 쿼터만큼 채움
 * - 쿼터를 못 채우면 부족분을 다른 지역 잔여분으로 보충 (곡 수 우선 = A안)
 * - 아티스트 중복 제거 (1아티스트 1곡) — 스토어마다 표기가 달라(DAY6 ↔ 데이식스) artistId로 비교
 * - isFresh(처음 보는 곡, D3)를 주면: 쿼터를 처음 보는 곡으로 먼저 채우고 → 모자란 자리 중
 *   FRESH_BORROW_LIMIT개까지 다른 지역의 처음 보는 곡으로 → 남은 쿼터를 머리 곡·본 곡으로 채운다.
 *   반환 순서는 뽑힌 순서라 처음 보는 곡이 앞에 온다. 주지 않으면 모두 처음 보는 곡으로 보고 위 규칙 그대로
 */
export function selectByRegionQuota(
  candidates: RegionedTrack[],
  quota: Record<Region, number> = REGION_QUOTA,
  isFresh: (candidate: RegionedTrack) => boolean = () => true,
): ITunesTrack[] {
  const total = Object.values(quota).reduce((a, b) => a + b, 0);
  const sorted = [...candidates].sort((a, b) => b.match - a.match);
  const fresh = sorted.filter(isFresh);
  const stale = sorted.filter((c) => !isFresh(c));

  const selected: ITunesTrack[] = [];
  const filled: Record<Region, number> = { korea: 0, pop: 0, jpop: 0 };
  const usedArtists = new Set<string>();
  const usedTrackIds = new Set<number>();

  const take = (rt: RegionedTrack): boolean => {
    const artistKey =
      rt.track.artistId != null
        ? `id:${rt.track.artistId}`
        : (rt.track.artistName?.toLowerCase() ?? '');
    if (usedTrackIds.has(rt.track.trackId)) return false;
    if (usedArtists.has(artistKey)) return false; // 1아티스트 1곡
    selected.push(rt.track);
    filled[rt.region]++;
    usedArtists.add(artistKey);
    usedTrackIds.add(rt.track.trackId);
    return true;
  };

  // 지역별로 쿼터의 남은 자리만큼 — 빌려 온 곡으로 total이 찼으면 멈춘다
  const fillQuota = (pool: RegionedTrack[]) => {
    for (const region of Object.keys(quota) as Region[]) {
      for (const rt of pool) {
        if (filled[region] >= quota[region] || selected.length >= total) break;
        if (rt.region === region) take(rt);
      }
    }
  };
  // 지역 상관없이 total까지 (limit개까지)
  const fillAny = (pool: RegionedTrack[], limit = Infinity) => {
    let taken = 0;
    for (const rt of pool) {
      if (selected.length >= total || taken >= limit) break;
      if (take(rt)) taken++;
    }
  };

  fillQuota(fresh);
  fillAny(fresh, FRESH_BORROW_LIMIT);
  fillQuota(stale);
  fillAny(sorted); // 그래도 모자라면 남은 후보 아무 지역에서나 (A안 — 곡 수 우선)

  return selected;
}

/** 해석 전 후보 — 지역과 순위(match)는 선곡에서 정해진다 */
export interface QuotaCandidate {
  region: Region;
  match: number;
}

export interface LazyQuotaOptions<C> {
  quota?: Record<Region, number>;
  isFresh?: (candidate: C) => boolean;
  /** 동시에 해석하는 최대 후보 수 */
  concurrency?: number;
  /** 해석 묶음 사이에 기다린다(iTunes 몰아 부르기 완화). 첫 묶음 앞에서는 부르지 않는다 */
  pause?: () => Promise<void>;
}

/**
 * selectByRegionQuota와 같은 규칙으로 고르되, 후보를 미리 다 해석하지 않고 규칙이 그 후보를 볼 때 해석한다.
 * - 결과는 "후보를 전부 해석한 뒤 selectByRegionQuota"와 같다(테스트로 묶음). 해석 실패(null)는 없는 후보로 본다
 * - 남은 자리 수만큼(최대 concurrency) 묶어 동시에 해석한다. 자리보다 많이 묶지 않으므로
 *   하나씩 해석할 때와 같은 후보만 해석한다(11/6 측정 기준 요청당 평균 20.2곡, 전부 해석하면 27곡)
 * - 같은 후보는 한 번만 해석한다
 * @returns 고른 후보와 그 트랙, 뽑힌 순서
 */
export async function selectByRegionQuotaLazily<C extends QuotaCandidate>(
  candidates: readonly C[],
  resolve: (candidate: C) => Promise<ITunesTrack | null>,
  {
    quota = REGION_QUOTA,
    isFresh = () => true,
    concurrency = 3,
    pause = async () => {},
  }: LazyQuotaOptions<C> = {},
): Promise<{ candidate: C; track: ITunesTrack }[]> {
  const total = Object.values(quota).reduce((a, b) => a + b, 0);
  const sorted = [...candidates].sort((a, b) => b.match - a.match);
  const fresh = sorted.filter(isFresh);
  const stale = sorted.filter((c) => !isFresh(c));

  const resolutions = new Map<C, Promise<ITunesTrack | null>>();
  let batches = 0;
  const resolveBatch = async (batch: C[]) => {
    const pending = batch.filter((c) => !resolutions.has(c));
    if (pending.length > 0) {
      if (batches++ > 0) await pause();
      for (const c of pending) resolutions.set(c, resolve(c));
    }
    return Promise.all(batch.map((c) => resolutions.get(c)!));
  };

  const selected: { candidate: C; track: ITunesTrack }[] = [];
  const filled: Record<Region, number> = { korea: 0, pop: 0, jpop: 0 };
  const usedArtists = new Set<string>();
  const usedTrackIds = new Set<number>();

  const take = (candidate: C, track: ITunesTrack | null): boolean => {
    if (!track) return false;
    const artistKey =
      track.artistId != null
        ? `id:${track.artistId}`
        : (track.artistName?.toLowerCase() ?? '');
    if (usedTrackIds.has(track.trackId)) return false;
    if (usedArtists.has(artistKey)) return false; // 1아티스트 1곡
    selected.push({ candidate, track });
    filled[candidate.region]++;
    usedArtists.add(artistKey);
    usedTrackIds.add(track.trackId);
    return true;
  };

  // pool 앞에서부터 남은 자리(room)만큼씩 묶어 해석하며 채운다
  const fill = async (pool: C[], room: () => number) => {
    let i = 0;
    while (i < pool.length && room() > 0) {
      const batch = pool.slice(i, i + Math.min(room(), concurrency));
      i += batch.length;
      const tracks = await resolveBatch(batch);
      batch.forEach((c, j) => take(c, tracks[j]));
    }
  };
  const left = () => total - selected.length;
  const fillQuota = async (pool: C[]) => {
    for (const region of Object.keys(quota) as Region[]) {
      await fill(
        pool.filter((c) => c.region === region),
        () => Math.min(quota[region] - filled[region], left()),
      );
    }
  };
  const fillAny = async (pool: C[], limit = Infinity) => {
    const before = selected.length;
    await fill(pool, () =>
      Math.min(limit - (selected.length - before), left()),
    );
  };

  await fillQuota(fresh);
  await fillAny(fresh, FRESH_BORROW_LIMIT);
  await fillQuota(stale);
  await fillAny(sorted); // 그래도 모자라면 남은 후보 아무 지역에서나 (A안 — 곡 수 우선)

  return selected;
}
