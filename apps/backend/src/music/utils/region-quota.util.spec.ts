import {
  selectByRegionQuota,
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

describe('selectByRegionQuota — 반환 순서 (isFresh 없음, 운영 Last.fm 경로)', () => {
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
