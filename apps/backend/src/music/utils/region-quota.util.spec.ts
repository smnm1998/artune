import {
  selectByRegionQuota,
  selectByRegionQuotaLazily,
  selectByRegionQuotaStream,
  QuotaCandidate,
  RegionedTrack,
  Region,
} from './region-quota.util';
import { ITunesTrack } from '../../itunes/itunes-track.type';

const track = (id: number, artist: string): ITunesTrack => ({
  trackId: id,
  trackName: `Song ${id}`,
  artistName: artist,
  collectionName: 'Album',
  artworkUrl100: 'x',
  trackTimeMillis: 200000,
  previewUrl: 'p',
  trackViewUrl: 'v',
});

const rt = (
  id: number,
  artist: string,
  region: Region,
  match = 0.5,
): RegionedTrack => ({
  track: track(id, artist),
  region,
  match,
});

// 지역별로 넉넉한 후보 생성
const many = (region: Region, count: number, offset: number): RegionedTrack[] =>
  Array.from({ length: count }, (_, i) =>
    rt(offset + i, `${region}-artist-${i}`, region, 0.9 - i * 0.01),
  );

describe('selectByRegionQuota', () => {
  it('쿼터가 충분히 채워지면 6:3:1로 선정한다', () => {
    const candidates = [
      ...many('korea', 10, 0),
      ...many('pop', 6, 100),
      ...many('jpop', 4, 200),
    ];
    const result = selectByRegionQuota(candidates);

    expect(result).toHaveLength(10);
    const byRegion = (r: Region) =>
      result.filter((t) => t.artistName.startsWith(r)).length;
    expect(byRegion('korea')).toBe(6);
    expect(byRegion('pop')).toBe(3);
    expect(byRegion('jpop')).toBe(1);
  });

  it('match 높은 순으로 채운다', () => {
    const candidates = [
      rt(1, 'k1', 'korea', 0.2),
      rt(2, 'k2', 'korea', 0.9),
      ...many('pop', 3, 100),
      ...many('jpop', 1, 200),
    ];
    const result = selectByRegionQuota(candidates, {
      korea: 1,
      pop: 3,
      jpop: 1,
    });
    // korea 쿼터 1 → match 0.9인 k2가 뽑혀야
    expect(result.find((t) => t.artistName === 'k2')).toBeTruthy();
    expect(result.find((t) => t.artistName === 'k1')).toBeFalsy();
  });

  it('J-pop 쿼터를 못 채우면 다른 지역으로 보충한다 (곡 수 우선)', () => {
    const candidates = [
      ...many('korea', 10, 0), // 넉넉
      ...many('pop', 6, 100), // 넉넉
      // jpop 0개
    ];
    const result = selectByRegionQuota(candidates);

    // 10곡은 보장, jpop 1자리는 korea/pop 잔여로 채워짐
    expect(result).toHaveLength(10);
    expect(result.filter((t) => t.artistName.startsWith('jpop'))).toHaveLength(
      0,
    );
  });

  it('전체 후보가 부족하면 있는 만큼만 반환한다', () => {
    const candidates = [...many('korea', 3, 0), ...many('pop', 2, 100)];
    const result = selectByRegionQuota(candidates);
    expect(result).toHaveLength(5);
  });

  it('같은 아티스트는 1곡만 포함한다', () => {
    const candidates = [
      rt(1, 'IU', 'korea', 0.9),
      rt(2, 'IU', 'korea', 0.95), // 중복 아티스트 — 쿼터 안에 들 만큼 match가 높아야 제거를 검증한다
      ...many('korea', 8, 100),
      ...many('pop', 3, 200),
      ...many('jpop', 1, 300),
    ];
    const result = selectByRegionQuota(candidates);
    const iuCount = result.filter((t) => t.artistName === 'IU').length;
    expect(iuCount).toBe(1);
  });

  it('스토어마다 표기가 달라도 artistId가 같으면 같은 아티스트로 본다', () => {
    // 검색 단계는 US 표기, 곡 목록 단계는 KR 표기를 돌려준다
    const us = rt(1, 'DAY6', 'korea', 0.99);
    const kr = rt(2, '데이식스', 'korea', 0.98);
    us.track.artistId = 100;
    kr.track.artistId = 100;
    const candidates = [
      us,
      kr,
      ...many('korea', 8, 100),
      ...many('pop', 3, 200),
      ...many('jpop', 1, 300),
    ];
    const result = selectByRegionQuota(candidates);
    expect(result.filter((t) => t.artistId === 100)).toEqual([us.track]);
  });
});

describe('selectByRegionQuota — 반환 순서 (isFresh 없음)', () => {
  it('한국 6 → 팝 3 → 일본 1 → 모자란 자리는 남은 후보 match 순, 두 지역이 모자라도 10곡', () => {
    const result = selectByRegionQuota([
      ...many('korea', 10, 0),
      ...many('pop', 1, 100),
    ]);
    expect(result.map((t) => t.artistName)).toEqual([
      ...[0, 1, 2, 3, 4, 5].map((i) => `korea-artist-${i}`),
      'pop-artist-0',
      ...[6, 7, 8].map((i) => `korea-artist-${i}`),
    ]);
  });
});

describe('selectByRegionQuota — 처음 보는 곡 우선 (isFresh, D3)', () => {
  // 처음 보는 곡(new)은 match 높게, 머리 곡·본 곡(old)은 낮게 — 정렬한 순서를 match로 넘기는 운영과 같다
  const pool = (region: Region, fresh: number, stale: number, top: number) => [
    ...Array.from({ length: fresh }, (_, i) =>
      rt(top * 100 + i, `${region}-new-${i}`, region, top - i * 0.01),
    ),
    ...Array.from({ length: stale }, (_, i) =>
      rt(
        top * 100 + 50 + i,
        `${region}-old-${i}`,
        region,
        top - 0.5 - i * 0.01,
      ),
    ),
  ];
  const isFresh = (c: RegionedTrack) => c.track.artistName.includes('-new');
  const names = (result: ITunesTrack[]) => result.map((t) => t.artistName);
  const count = (result: ITunesTrack[], prefix: string) =>
    result.filter((t) => t.artistName.startsWith(prefix)).length;
  const stale = (result: ITunesTrack[]) =>
    result.filter((t) => t.artistName.includes('-old')).length;

  it('처음 보는 곡으로 쿼터가 차면 match가 더 높아도 머리·본 곡은 들어가지 않는다', () => {
    const result = selectByRegionQuota(
      [
        rt(1, 'korea-old-top', 'korea', 0.99),
        ...pool('korea', 6, 0, 0.9),
        ...pool('pop', 3, 0, 0.8),
        ...pool('jpop', 1, 0, 0.7),
      ],
      undefined,
      isFresh,
    );
    expect(result).toHaveLength(10);
    expect(stale(result)).toBe(0);
  });

  it('처음 보는 곡이 모자란 지역은 한 자리를 다른 지역의 처음 보는 곡으로 채운다 — 처음 보는 곡이 앞', () => {
    // 예: 심취 한국 후보 7곡 중 4곡만 처음 → 지금은 본 곡 2곡이 남지만, 팝의 처음 보는 곡 1곡이 1자리를 가져간다
    const result = selectByRegionQuota(
      [
        ...pool('korea', 4, 3, 0.9),
        ...pool('pop', 5, 0, 0.8),
        ...pool('jpop', 2, 0, 0.7),
      ],
      undefined,
      isFresh,
    );
    expect(names(result)).toEqual([
      'korea-new-0',
      'korea-new-1',
      'korea-new-2',
      'korea-new-3',
      'pop-new-0',
      'pop-new-1',
      'pop-new-2',
      'jpop-new-0',
      'pop-new-3', // 빌려 온 자리 — 남은 처음 보는 곡 중 match가 가장 높다
      'korea-old-0',
    ]);
  });

  it('빌리는 건 1자리까지 — 나머지는 그 지역의 머리·본 곡으로 채워 한국 곡은 5곡을 지킨다', () => {
    const result = selectByRegionQuota(
      [
        ...pool('korea', 2, 5, 0.9),
        ...pool('pop', 5, 0, 0.8),
        ...pool('jpop', 2, 0, 0.7),
      ],
      undefined,
      isFresh,
    );
    expect(result).toHaveLength(10);
    expect(count(result, 'korea')).toBe(5);
    expect(count(result, 'korea-old')).toBe(3);
    expect(count(result, 'pop')).toBe(4);
  });

  it('처음 보는 곡과 머리·본 곡 사이에도 1아티스트 1곡', () => {
    const newIu = rt(1, 'IU-new', 'korea', 0.95);
    const oldIu = rt(2, 'IU-old', 'korea', 0.45); // 머리·본 곡 중 match가 가장 높다
    newIu.track.artistId = 7;
    oldIu.track.artistId = 7;
    const result = selectByRegionQuota(
      [
        newIu,
        oldIu,
        ...pool('korea', 2, 4, 0.9),
        ...pool('pop', 5, 0, 0.8),
        ...pool('jpop', 2, 0, 0.7),
      ],
      undefined,
      isFresh,
    );
    expect(result).toHaveLength(10);
    expect(result.filter((t) => t.artistId === 7)).toEqual([newIu.track]);
  });

  it('모두 머리·본 곡이어도 6:3:1로 10곡을 채운다 (곡 수 우선)', () => {
    const result = selectByRegionQuota(
      [
        ...pool('korea', 0, 8, 0.9),
        ...pool('pop', 0, 4, 0.8),
        ...pool('jpop', 0, 2, 0.7),
      ],
      undefined,
      isFresh,
    );
    expect(result).toHaveLength(10);
    expect([
      count(result, 'korea'),
      count(result, 'pop'),
      count(result, 'jpop'),
    ]).toEqual([6, 3, 1]);
  });
});

describe('selectByRegionQuotaLazily — 규칙이 볼 때만 해석', () => {
  // 고정 시드 난수 — 실패한 경우를 같은 입력으로 다시 볼 수 있다
  const random = (seed: number) => () =>
    (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  type Pick = QuotaCandidate & {
    id: number;
    found: ITunesTrack | null;
    fresh: boolean;
  };
  const regions: Region[] = ['korea', 'pop', 'jpop'];
  // 해석 실패 · match 동점 · 같은 trackId · 같은 아티스트(artistId 유무)가 섞인 후보
  const scenario = (rnd: () => number): Pick[] =>
    Array.from({ length: Math.floor(rnd() * 22) }, (_, id) => {
      const found = track(Math.floor(rnd() * 25), `a${Math.floor(rnd() * 12)}`);
      if (rnd() < 0.5) found.artistId = Math.floor(rnd() * 12);
      return {
        id,
        region: regions[Math.floor(rnd() * 3)],
        match: Math.round(rnd() * 5) / 5,
        found: rnd() < 0.85 ? found : null,
        fresh: rnd() < 0.7,
      };
    });
  const quotas = [undefined, { korea: 2, pop: 1, jpop: 1 }];

  it('후보를 전부 해석한 뒤 selectByRegionQuota로 고른 결과와 같다 (무작위 500가지)', async () => {
    const rnd = random(11);
    for (let n = 0; n < 500; n++) {
      const picks = scenario(rnd);
      const quota = quotas[n % 2];
      const regioned = picks
        .filter((p) => p.found)
        .map((p) => ({ track: p.found!, region: p.region, match: p.match, p }));
      const expected = selectByRegionQuota(
        regioned,
        quota,
        (rt) => regioned.find((r) => r === rt)!.p.fresh,
      );

      const lazy = await selectByRegionQuotaLazily(
        picks,
        async (p) => p.found,
        { quota, isFresh: (p) => p.fresh },
      );

      expect(lazy.map((s) => s.track)).toStrictEqual(expected);
    }
  });

  it('묶어서 해석해도 하나씩 해석할 때와 같은 후보만, 한 번씩만 해석한다', async () => {
    const rnd = random(23);
    for (let n = 0; n < 300; n++) {
      const picks = scenario(rnd);
      const calls = async (concurrency: number) => {
        const ids: number[] = [];
        await selectByRegionQuotaLazily(
          picks,
          async (p) => {
            ids.push(p.id);
            return p.found;
          },
          { isFresh: (p) => p.fresh, concurrency },
        );
        return ids;
      };
      const one = await calls(1);
      const three = await calls(3);
      expect(new Set(three)).toEqual(new Set(one));
      expect(three).toHaveLength(new Set(three).size);
    }
  });

  // 완화 15곡(한국 8 · 팝 5 · 일본 2)을 모두 찾을 수 있고 모두 처음 보는 곡
  const soothe15 = (): Pick[] =>
    (
      [
        ['korea', 8],
        ['pop', 5],
        ['jpop', 2],
      ] as const
    ).flatMap(([region, n], r) =>
      Array.from({ length: n }, (_, i) => ({
        id: r * 10 + i,
        region,
        match: 1 - (r * 10 + i) / 100,
        found: track(r * 10 + i, `${region}-${i}`),
        fresh: true,
      })),
    );

  it('처음 보는 곡이 모두 찾아지면 화면 10곡만 해석한다 — 나머지 5곡은 iTunes를 부르지 않는다', async () => {
    const resolve = jest.fn(async (p: Pick) => p.found);

    const result = await selectByRegionQuotaLazily(soothe15(), resolve);

    expect(result).toHaveLength(10);
    expect(resolve).toHaveBeenCalledTimes(10);
  });

  it('한 번에 concurrency개까지만 동시에 해석하고, 묶음 사이에만 쉰다', async () => {
    let inFlight = 0;
    let most = 0;
    const pause = jest.fn(async () => {});
    await selectByRegionQuotaLazily(
      soothe15(),
      async (p) => {
        most = Math.max(most, ++inFlight);
        await new Promise((r) => setImmediate(r));
        inFlight--;
        return p.found;
      },
      { concurrency: 3, pause },
    );

    expect(most).toBe(3);
    // 묶음: 한국 3 · 3, 팝 3, 일본 1 → 4묶음, 사이 3번
    expect(pause).toHaveBeenCalledTimes(3);
  });
});

describe('selectByRegionQuotaStream — 후보가 하나씩 도착해도 같은 결과', () => {
  const random = (seed: number) => () =>
    (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  type Pick = QuotaCandidate & {
    id: number;
    found: ITunesTrack | null;
    fresh: boolean;
  };
  const regions: Region[] = ['korea', 'pop', 'jpop'];
  const quotas = [undefined, { korea: 2, pop: 1, jpop: 1 }];
  /** 이벤트 루프를 n번 돌린다 — 도착·해석 사이 간격을 흉내 낸다 */
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
  };
  const pick = (id: number, region: Region, fresh = true): Pick => ({
    id,
    region,
    match: 100 - id,
    found: track(id, `${region}-${id}`),
    fresh,
  });

  /** AI가 쓴 순서처럼: 처음 보는 곡은 순위 순서로, 뒤로 민 곡(머리 곡·본 곡)은 그 사이 아무 데나 */
  const arrivalOrder = (rnd: () => number): Pick[] => {
    const picks: Pick[] = Array.from(
      { length: Math.floor(rnd() * 22) },
      (_, id) => {
        const found = track(
          Math.floor(rnd() * 25),
          `a${Math.floor(rnd() * 12)}`,
        );
        if (rnd() < 0.5) found.artistId = Math.floor(rnd() * 12);
        return {
          id,
          region: regions[Math.floor(rnd() * 3)],
          match: Math.round(rnd() * 5) / 5,
          found: rnd() < 0.85 ? found : null,
          fresh: rnd() < 0.7,
        };
      },
    );
    const arrival = picks
      .filter((p) => p.fresh)
      .sort((a, b) => b.match - a.match);
    for (const p of picks.filter((p) => !p.fresh)) {
      arrival.splice(Math.floor(rnd() * (arrival.length + 1)), 0, p);
    }
    return arrival;
  };

  it('다 모인 뒤 고른 결과와 같고, 고를 때마다 최종 순서대로 알리며, 같은 후보만 한 번씩 해석한다 (무작위 500가지)', async () => {
    const rnd = random(31);
    for (let n = 0; n < 500; n++) {
      const arrival = arrivalOrder(rnd);
      const quota = quotas[n % 2];
      const lazyCalls: number[] = [];
      const lazy = await selectByRegionQuotaLazily(
        arrival,
        async (p) => {
          lazyCalls.push(p.id);
          return p.found;
        },
        { quota, isFresh: (p) => p.fresh },
      );

      const calls: number[] = [];
      const takes: unknown[] = [];
      const stream = selectByRegionQuotaStream<Pick>(
        async (p) => {
          calls.push(p.id);
          await ticks(Math.floor(rnd() * 4));
          return p.found;
        },
        { quota, isFresh: (p) => p.fresh, onTake: (s) => takes.push(s) },
      );
      for (const p of arrival) {
        await ticks(Math.floor(rnd() * 3));
        stream.push(p);
      }
      stream.end();
      const result = await stream.result;

      expect(result.map((s) => s.candidate.id)).toEqual(
        lazy.map((s) => s.candidate.id),
      );
      expect(takes).toEqual(result);
      expect(new Set(calls)).toEqual(new Set(lazyCalls));
      expect(calls).toHaveLength(new Set(calls).size);
    }
  });

  it('처음 보는 한국 곡은 후보가 다 오기 전에 고른다 — 첫 곡을 바로 내보낼 수 있다', async () => {
    const onTake = jest.fn();
    const stream = selectByRegionQuotaStream<Pick>(async (p) => p.found, {
      onTake,
    });

    stream.push(pick(0, 'korea'));
    await ticks(3);

    expect(onTake).toHaveBeenCalledTimes(1);
    stream.end();
    await stream.result;
  });

  it('앞 지역이 다 차기 전에는 다음 지역 곡을 고르지 않는다 — 내보내는 순서가 최종 순서', async () => {
    const taken: number[] = [];
    const stream = selectByRegionQuotaStream<Pick>(async (p) => p.found, {
      onTake: (s) => taken.push(s.candidate.id),
    });

    stream.push(pick(0, 'pop'));
    await ticks(3);
    expect(taken).toEqual([]);

    for (let id = 1; id <= 6; id++) stream.push(pick(id, 'korea'));
    await ticks(10);
    expect(taken).toEqual([1, 2, 3, 4, 5, 6, 0]);

    stream.end();
    await stream.result;
  });

  it('동시에 concurrency개까지만 해석한다', async () => {
    let inFlight = 0;
    let most = 0;
    const stream = selectByRegionQuotaStream<Pick>(
      async (p) => {
        most = Math.max(most, ++inFlight);
        await ticks(2);
        inFlight--;
        return p.found;
      },
      { concurrency: 3 },
    );

    for (let id = 0; id < 8; id++) stream.push(pick(id, 'korea'));
    stream.end();
    await stream.result;

    expect(most).toBe(3);
  });

  it('취소하면 새 해석을 시작하지 않고 결과가 거부된다', async () => {
    const controller = new AbortController();
    const resolve = jest.fn(async (p: Pick) => {
      await ticks(2);
      return p.found;
    });
    const stream = selectByRegionQuotaStream<Pick>(resolve, {
      signal: controller.signal,
    });

    stream.push(pick(0, 'korea'));
    await ticks(1);
    controller.abort();
    for (let id = 1; id <= 5; id++) stream.push(pick(id, 'korea'));

    await expect(stream.result).rejects.toMatchObject({ name: 'AbortError' });
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
