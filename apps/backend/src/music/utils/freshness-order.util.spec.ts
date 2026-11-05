import { orderByFreshness } from './freshness-order.util';
import { Region, selectByRegionQuota } from './region-quota.util';
import { songKey } from './song-key.util';

const keyed = (...keys: string[]) => keys.map((key) => ({ key }));
const keysOf = (songs: { key: string }[]) => songs.map((s) => s.key);

describe('orderByFreshness', () => {
  it('처음 보는 곡 → 머리 곡 → 본 곡 순서, 같은 묶음 안은 LLM이 고른 순서 그대로', () => {
    const ordered = orderByFreshness(
      keyed('seen-1', 'head-1', 'new-1', 'seen-2', 'new-2', 'head-2'),
      {
        heads: new Set(['head-1', 'head-2']),
        seen: new Set(['seen-1', 'seen-2']),
      },
    );
    expect(keysOf(ordered)).toEqual([
      'new-1',
      'new-2',
      'head-1',
      'head-2',
      'seen-1',
      'seen-2',
    ]);
  });

  it('머리 곡이면서 이 사람이 본 곡이면 맨 뒤', () => {
    const ordered = orderByFreshness(keyed('both', 'head', 'new'), {
      heads: new Set(['both', 'head']),
      seen: new Set(['both']),
    });
    expect(keysOf(ordered)).toEqual(['new', 'head', 'both']);
  });

  it('예시 (V3 joy-h2, 이 사람의 2번째 사용): 본 곡은 남는 자리가 있으면 빠지고, 모자라면 남는다', () => {
    const picks: { artist: string; title: string; region: Region }[] = [
      { artist: 'CHEEZE', title: '오늘의 기분', region: 'korea' },
      { artist: 'IU', title: '금요일에 만나요', region: 'korea' },
      { artist: '스탠딩 에그', title: '오래된 노래', region: 'korea' },
      { artist: '김광석', title: '바람이 불어오는 곳', region: 'korea' },
      { artist: '이하이', title: '한숨', region: 'korea' },
      { artist: '윤하', title: '사건의 지평선', region: 'korea' },
      { artist: '권진아', title: '위로', region: 'korea' },
      { artist: 'Jack Johnson', title: 'Upside Down', region: 'pop' },
      { artist: 'Norah Jones', title: 'Sunrise', region: 'pop' },
      { artist: 'Jason Mraz', title: 'Have It All', region: 'pop' },
      { artist: 'The Beatles', title: 'Here Comes the Sun', region: 'pop' },
      { artist: 'あいみょん', title: 'ハルノヒ', region: 'jpop' },
    ];
    const keyOf = (title: string) =>
      songKey(picks.find((p) => p.title === title)!);
    // 정렬한 순서를 점수로 지역 쿼터(6:3:1)에 넣는다. 해석은 모두 성공했다고 본다
    const serve = (songs: typeof picks) =>
      selectByRegionQuota(
        songs.map((p, i) => ({
          track: {
            trackId: i,
            trackName: p.title,
            artistName: p.artist,
            collectionName: 'Album',
            artworkUrl100: 'x',
            trackTimeMillis: 200000,
            previewUrl: 'p',
            trackViewUrl: 'v',
          },
          region: p.region,
          match: songs.length - i,
        })),
      ).map((t) => t.trackName);

    const ordered = orderByFreshness(
      picks.map((p) => ({ ...p, key: songKey(p) })),
      {
        // 최근 30목록 중 7번·5번·5번 나온 곡
        heads: new Set(
          ['바람이 불어오는 곳', 'Upside Down', 'Here Comes the Sun'].map(
            keyOf,
          ),
        ),
        // 이 사람이 1번째 사용에서 본 곡
        seen: new Set(['한숨', '사건의 지평선', 'Sunrise'].map(keyOf)),
      },
    );

    expect(serve(picks)).toEqual([
      '오늘의 기분',
      '금요일에 만나요',
      '오래된 노래',
      '바람이 불어오는 곳',
      '한숨',
      '사건의 지평선',
      'Upside Down',
      'Sunrise',
      'Have It All',
      'ハルノヒ',
    ]);
    // '사건의 지평선'·'Sunrise'가 빠지고 '위로'·'Here Comes the Sun'이 들어온다.
    // 한국 곡은 7곡 중 6자리라 남는 자리가 1개뿐이어서 '한숨'은 본 곡이어도 남는다
    expect(serve(ordered)).toEqual([
      '오늘의 기분',
      '금요일에 만나요',
      '오래된 노래',
      '위로',
      '바람이 불어오는 곳',
      '한숨',
      'Have It All',
      'Upside Down',
      'Here Comes the Sun',
      'ハルノヒ',
    ]);
  });
});
