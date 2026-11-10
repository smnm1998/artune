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
 * 지역 쿼터(기본 6:3:1)로 최종 목록 선정 — 후보를 모두 해석한 뒤 고르는 기준 구현.
 * 운영에서는 부르지 않는다(R4 이후). 운영은 selectByRegionQuotaLazily이고, 이 함수는 그 정답 기준(테스트 오라클)이다.
 * 규칙을 한 번에 읽히게 두고, 게으른 함수가 같은 결과를 내는지 무작위 입력으로 대조한다.
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

export interface Selected<C> {
  candidate: C;
  track: ITunesTrack;
}

/**
 * 고른 목록과 고르는 규칙(1아티스트 1곡 · 같은 트랙 한 번 · 남은 자리) — 게으른 판과 스트리밍 판이 같이 쓴다
 * @param onTake 고를 때마다 (고른 순서 = 최종 순서)
 */
function createSelection<C extends QuotaCandidate>(
  quota: Record<Region, number>,
  onTake?: (selected: Selected<C>) => void,
) {
  const total = Object.values(quota).reduce((a, b) => a + b, 0);
  const selected: Selected<C>[] = [];
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
    const entry = { candidate, track };
    selected.push(entry);
    filled[candidate.region]++;
    usedArtists.add(artistKey);
    usedTrackIds.add(track.trackId);
    onTake?.(entry);
    return true;
  };
  const left = () => total - selected.length;
  /** 그 지역 단계의 남은 자리 */
  const roomIn = (region: Region) => () =>
    Math.min(quota[region] - filled[region], left());
  return { selected, take, left, roomIn };
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
): Promise<Selected<C>[]> {
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

  const { selected, take, left, roomIn } = createSelection<C>(quota);

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
  const fillQuota = async (pool: C[]) => {
    for (const region of Object.keys(quota) as Region[]) {
      await fill(
        pool.filter((c) => c.region === region),
        roomIn(region),
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

export interface StreamQuotaOptions<C> {
  quota?: Record<Region, number>;
  isFresh?: (candidate: C) => boolean;
  /** 동시에 해석하는 최대 후보 수 */
  concurrency?: number;
  /** 고를 때마다 (고른 순서 = 최종 순서) — 화면에 바로 내보낼 수 있다 */
  onTake?: (selected: Selected<C>) => void;
  /** 취소되면 새 해석을 시작하지 않고 result가 그 이유로 거부된다 */
  signal?: AbortSignal;
}

export interface QuotaStream<C> {
  /** 후보 하나 도착 — 처음 보는 곡끼리는 순위(match) 내림차순으로 넣는다 (AI가 쓴 순서) */
  push(candidate: C): void;
  /** 후보가 다 왔다 */
  end(): void;
  /** 고른 후보와 트랙, 뽑힌 순서 */
  result: Promise<Selected<C>[]>;
}

/**
 * selectByRegionQuotaLazily의 스트리밍 판 — 후보가 하나씩 도착하는 동안 같은 규칙으로 고른다.
 * 결과(고른 후보와 순서)와 해석하는 후보는 "후보가 다 모인 뒤 selectByRegionQuotaLazily"와 같다(테스트로 묶음).
 * - 규칙은 단계마다 순위 순서로, 자리가 찰 때까지 해석에 성공한 후보를 고르는 것이라 묶음 경계와 상관없다.
 *   그래서 처음 보는 곡은 도착하는 대로 해석하고 고를 수 있다 → 첫 곡을 생성이 끝나기 전에 내보낸다
 * - 지역 단계 순서(한국 → 팝 → 일본)는 그대로라, 앞 지역이 다 찬 뒤에 다음 지역 곡을 고른다(최종 순서 유지)
 * - 빌리기·뒤로 민 곡(머리 곡·본 곡)·남은 자리 채우기는 전체 순위가 필요하다 — 1단계가 자리를 다 못 채웠다면 입력이 끝난 뒤라 그때 한다
 * - 해석은 지금 단계의 남은 자리만큼(최대 concurrency) 앞서 시작한다. 기다리는 동안 도착한 후보도 그 안이면 바로 시작
 * - 묶음 사이 쉼은 없다 — 후보가 AI 생성 속도로 도착해 호출 간격이 저절로 벌어진다 (차단은 측정으로 확인)
 */
export function selectByRegionQuotaStream<C extends QuotaCandidate>(
  resolve: (candidate: C) => Promise<ITunesTrack | null>,
  {
    quota = REGION_QUOTA,
    isFresh = () => true,
    concurrency = 3,
    onTake,
    signal,
  }: StreamQuotaOptions<C> = {},
): QuotaStream<C> {
  const arrived: C[] = [];
  let ended = false;
  // 후보 도착·입력 끝·취소를 기다리는 쪽에 알린다
  let wake = () => {};
  const nextChange = () => new Promise<void>((r) => (wake = r));
  let changed = nextChange();
  let prefetch: (() => void) | null = null;
  const notify = () => {
    prefetch?.();
    const done = wake;
    changed = nextChange();
    done();
  };
  signal?.addEventListener('abort', notify, { once: true });

  const resolutions = new Map<C, Promise<ITunesTrack | null>>();
  const resolveOnce = (candidate: C) => {
    let pending = resolutions.get(candidate);
    if (!pending) {
      pending = resolve(candidate);
      pending.catch(() => {}); // 앞서 시작만 하고 안 쓴 해석의 실패가 처리 안 된 거부로 남지 않게
      resolutions.set(candidate, pending);
    }
    return pending;
  };
  const { selected, take, left, roomIn } = createSelection<C>(quota, onTake);

  /** pool의 i번째 후보 — 아직 안 왔으면 오거나 입력이 끝날 때까지 기다린다 */
  const at = async (pool: () => C[], i: number) => {
    while (pool().length <= i && !ended) {
      signal?.throwIfAborted();
      await changed;
    }
    signal?.throwIfAborted();
    return pool()[i];
  };

  const fill = async (pool: () => C[], room: () => number) => {
    for (let i = 0; room() > 0; i++) {
      const candidate = await at(pool, i);
      if (!candidate) return;
      prefetch = () => {
        if (signal?.aborted) return;
        pool()
          .slice(i, i + Math.min(room(), concurrency))
          .forEach(resolveOnce);
      };
      prefetch();
      const track = await resolveOnce(candidate);
      prefetch = null;
      signal?.throwIfAborted();
      take(candidate, track);
    }
  };
  const fillAny = (pool: C[], limit = Infinity) => {
    const before = selected.length;
    return fill(
      () => pool,
      () => Math.min(limit - (selected.length - before), left()),
    );
  };
  const regions = Object.keys(quota) as Region[];

  const run = async () => {
    for (const region of regions) {
      await fill(
        () => arrived.filter((c) => isFresh(c) && c.region === region),
        roomIn(region),
      );
    }
    // 여기 왔다면 입력이 끝났거나(그래서 1단계가 후보를 다 봤거나) 세 지역 자리가 다 찼다.
    // 다 찼으면 아래 단계는 남은 자리가 0이라 아무것도 하지 않으므로, 따로 입력 끝을 기다리지 않아도 전체 순위로 고른 것과 같다
    const sorted = [...arrived].sort((a, b) => b.match - a.match);
    const fresh = sorted.filter(isFresh);
    const stale = sorted.filter((c) => !isFresh(c));
    await fillAny(fresh, FRESH_BORROW_LIMIT);
    for (const region of regions) {
      await fill(
        () => stale.filter((c) => c.region === region),
        roomIn(region),
      );
    }
    await fillAny(sorted); // 그래도 모자라면 남은 후보 아무 지역에서나 (A안 — 곡 수 우선)
    return selected;
  };

  return {
    push(candidate) {
      if (ended) return;
      arrived.push(candidate);
      notify();
    },
    end() {
      ended = true;
      notify();
    },
    result: run(),
  };
}
