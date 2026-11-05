import { songKey } from './song-key.util';

describe('songKey', () => {
  it('16진수 8자', () => {
    expect(songKey({ artist: 'IU', title: '금요일에 만나요' })).toMatch(
      /^[0-9a-f]{8}$/,
    );
  });

  it.each([
    [
      '대소문자',
      { artist: 'IU', title: 'Love poem' },
      { artist: 'iu', title: 'Love Poem' },
    ],
    [
      'The',
      { artist: 'The Beatles', title: 'Here Comes the Sun' },
      { artist: 'Beatles', title: 'Here Comes the Sun' },
    ],
    [
      '피처링',
      { artist: 'IU', title: '금요일에 만나요 (Feat. 장이정)' },
      { artist: 'IU', title: '금요일에 만나요' },
    ],
    [
      '띄어쓰기',
      { artist: '스탠딩 에그', title: '오래된 노래' },
      { artist: '스탠딩에그', title: '오래된노래' },
    ],
  ])('LLM 표기의 %s 차이는 같은 곡으로 본다', (_, a, b) => {
    expect(songKey(a)).toBe(songKey(b));
  });

  it('곡명이나 아티스트가 다르면 다른 곡', () => {
    const sunrise = songKey({ artist: 'Norah Jones', title: 'Sunrise' });
    expect(
      songKey({ artist: 'Norah Jones', title: "Don't Know Why" }),
    ).not.toBe(sunrise);
    expect(songKey({ artist: 'Simply Red', title: 'Sunrise' })).not.toBe(
      sunrise,
    );
  });

  it('아티스트와 곡명의 경계를 구분한다', () => {
    // 경계 없이 이어 붙이면 둘 다 'abc'
    expect(songKey({ artist: 'AB', title: 'C' })).not.toBe(
      songKey({ artist: 'A', title: 'BC' }),
    );
  });
});
