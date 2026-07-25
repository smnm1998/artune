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
      rt(2, 'IU', 'korea', 0.8), // 중복 아티스트
      ...many('korea', 8, 100),
      ...many('pop', 3, 200),
      ...many('jpop', 1, 300),
    ];
    const result = selectByRegionQuota(candidates);
    const iuCount = result.filter((t) => t.artistName === 'IU').length;
    expect(iuCount).toBe(1);
  });
});
