import { songKey } from './song-key.util';

describe('songKey', () => {
  it('16진수 8자', () => {
    expect(songKey({ title: '금요일에 만나요' })).toMatch(/^[0-9a-f]{8}$/);
  });

  it.each([
    ['대소문자', 'Love poem', 'Love Poem'],
    ['피처링', '금요일에 만나요 (Feat. 장이정)', '금요일에 만나요'],
    ['띄어쓰기', '오래된 노래', '오래된노래'],
    ['기호', '보이나요?', '보이나요'],
  ])('LLM 표기의 곡명 %s 차이는 같은 곡으로 본다', (_, a, b) => {
    expect(songKey({ title: a })).toBe(songKey({ title: b }));
  });

  // 11/6 D4 측정에서 같은 곡이 두 표기로 들어온 예
  it.each([
    [
      { artist: '아이유', title: '밤편지' },
      { artist: 'IU', title: '밤편지' },
    ],
    [
      { artist: 'DAY6', title: '한 페이지가 될 수 있게' },
      { artist: '데이식스', title: '한 페이지가 될 수 있게' },
    ],
  ])('아티스트 표기가 달라도 같은 곡으로 본다 (%o)', (a, b) => {
    expect(songKey(a)).toBe(songKey(b));
  });

  it('곡명이 다르면 다른 곡', () => {
    expect(songKey({ title: 'Sunrise' })).not.toBe(
      songKey({ title: "Don't Know Why" }),
    );
  });

  it('한계: 곡명이 같은 다른 곡도 같은 키다 (뒤로 미룰 뿐 빼지는 않는다)', () => {
    const hyukoh = { artist: '혁오', title: 'TOMBOY' };
    const idle = { artist: '(G)I-DLE', title: 'TOMBOY' };
    expect(songKey(hyukoh)).toBe(songKey(idle));
  });
});
