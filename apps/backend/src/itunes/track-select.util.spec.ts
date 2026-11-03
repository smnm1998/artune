import { selectTrack, TrackCandidate } from './track-select.util';

// 후보 표기는 11/3 실측(US 검색 limit 5 + KR·JP lookup)에서 가져왔다. track은 id만 둔다
const cand = (
  id: number,
  ...names: [trackName: string, artistName: string][]
): TrackCandidate<number> => ({
  track: id,
  names: names.map(([trackName, artistName]) => ({ trackName, artistName })),
});

describe('selectTrack', () => {
  it('KR 표기로 한글 곡명·아티스트를 대조한다', () => {
    const candidates = [
      cand(1, ['Good Day', 'IU'], ['좋은 날', '아이유']),
      cand(
        2,
        ['Good Day (Instrumental)', 'IU'],
        ['좋은 날 (Instrumental)', '아이유'],
      ),
    ];

    expect(
      selectTrack({ artist: '아이유', title: '좋은 날' }, candidates),
    ).toBe(1);
  });

  it('곡명·아티스트가 서로 다른 스토어 표기에서 맞아도 일치로 본다', () => {
    const candidates = [
      cand(
        1,
        ['Galaxy', 'BOL4'],
        ['우주를 줄게', '볼빨간사춘기'],
        ['Galaxy', 'Bolbbalgan4'],
      ),
    ];

    expect(
      selectTrack({ artist: '볼빨간사춘기', title: '우주를 줄게' }, candidates),
    ).toBe(1);
  });

  it('앞 순위의 Live·Remix보다 원곡을 고른다', () => {
    const candidates = [
      cand(1, ['Dynamite (Live)', 'BTS'], ['Dynamite (Live)', '방탄소년단']),
      cand(2, ['Dynamite (Holiday Remix)', 'BTS']),
      cand(3, ['Dynamite', 'BTS'], ['Dynamite', '방탄소년단']),
      cand(4, ['Dynamite', 'KIDZ BOP Kids']),
    ];

    expect(selectTrack({ artist: 'BTS', title: 'Dynamite' }, candidates)).toBe(
      3,
    );
  });

  it('원곡이 없으면 대체 버전을 고른다', () => {
    // 원곡 후보는 JP 스토어에 없어 '平井 堅' 표기가 없다 → 아티스트 대조 실패
    const candidates = [
      cand(1, ['Hitomiwo Tojite', 'Ken Hirai'], ['瞳をとじて', 'Ken Hirai']),
      cand(
        2,
        [
          'hitomiwotojite - Ken Hirai 10th Anniversary Tour Final (Live Version)',
          'Ken Hirai',
        ],
        [
          '瞳をとじて - Ken Hirai 10th Anniversary Tour Final (Live Version)',
          '平井 堅',
        ],
      ),
    ];

    expect(
      selectTrack({ artist: '平井堅', title: '瞳をとじて' }, candidates),
    ).toBe(2);
  });

  it('요청 곡명에 버전 표기가 있으면 그 버전을 고른다', () => {
    const candidates = [
      cand(1, ['Dynamite (Live)', 'BTS']),
      cand(2, ['Dynamite (Holiday Remix)', 'BTS']),
    ];

    expect(
      selectTrack(
        { artist: 'BTS', title: 'Dynamite (Holiday Remix)' },
        candidates,
      ),
    ).toBe(2);
  });

  it('보컬 없는 버전은 대체 버전으로도 채택하지 않는다', () => {
    const candidates = [
      cand(
        1,
        ['Good Day (Instrumental)', 'IU'],
        ['좋은 날 (Instrumental)', '아이유'],
      ),
    ];

    expect(
      selectTrack({ artist: '아이유', title: '좋은 날' }, candidates),
    ).toBeNull();
  });

  it("곡명 속 'Mr.'는 반주(MR) 표기로 보지 않는다", () => {
    const candidates = [
      cand(
        1,
        [
          'Good Day (From "Mr. Sunshine", Pt. 5) [Original Television Soundtrack]',
          'MeloMance',
        ],
        [
          '좋은 날 (From "미스터 션샤인", Pt. 5) [Original Television Soundtrack]',
          '멜로망스',
        ],
      ),
    ];

    expect(
      selectTrack({ artist: '멜로망스', title: '좋은 날' }, candidates),
    ).toBe(1);
  });

  it('곡명이 같아도 다른 아티스트(자장가·커버)는 거부한다', () => {
    const candidates = [
      cand(1, ['Holiday', 'Green Day']),
      cand(2, ['American Idiot', 'Rockabye Baby!']),
      cand(3, ['Wake Me Up When September Ends', 'Green Day']),
      cand(4, ['American Idiot', 'Sparrow Sleeps']),
    ];

    expect(
      selectTrack({ artist: 'Green Day', title: 'American Idiot' }, candidates),
    ).toBeNull();
  });

  it('곡명에만 피처링으로 표기된 아티스트도 인정한다', () => {
    const candidates = [
      cand(1, ['Uptown Funk (feat. Bruno Mars)', 'Mark Ronson']),
    ];

    expect(
      selectTrack({ artist: 'Bruno Mars', title: 'Uptown Funk' }, candidates),
    ).toBe(1);
  });

  it('곡명 앞부분만 같은 같은 가수의 다른 곡은 거부한다', () => {
    const candidates = [
      cand(
        1,
        ['The Hardest Part (Instrumental)', 'Roy Kim'],
        ['우리 그만하자 (Instrumental)', '로이킴'],
      ),
      cand(2, ['The Hardest Part', 'Roy Kim'], ['우리 그만하자', '로이킴']),
    ];

    expect(
      selectTrack(
        { artist: '로이킴', title: '우리 그만 헤어져요' },
        candidates,
      ),
    ).toBeNull();
  });

  it('긴 곡명 속 짧은 단어로 피처링 곡을 잡지 않는다', () => {
    const candidates = [cand(1, ['Woman (feat. Lana Del Rey)', 'Cat Power'])];

    expect(
      selectTrack(
        {
          artist: 'Lana Del Rey',
          title:
            'Hope Is a Dangerous Thing for a Woman Like Me to Have - But I Have It',
        },
        candidates,
      ),
    ).toBeNull();
  });

  it('후보가 없으면 null', () => {
    expect(selectTrack({ artist: 'IU', title: 'Good Day' }, [])).toBeNull();
  });
});
