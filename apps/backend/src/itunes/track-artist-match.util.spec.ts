import {
  artistMatches,
  featuredArtists,
  normalizeArtist,
} from './track-artist-match.util';

describe('normalizeArtist', () => {
  it('대소문자·공백·기호를 제거해 정규화한다', () => {
    expect(normalizeArtist('Zion.T')).toBe('ziont');
    expect(normalizeArtist('Jung Kook')).toBe('jungkook');
    expect(normalizeArtist('Rockabye Baby!')).toBe('rockabyebaby');
  });
});

describe('artistMatches', () => {
  it('표기 차이(대소문자·공백·기호)를 흡수한다', () => {
    expect(artistMatches('Zion.T', ['ZION.T'])).toBe(true);
    expect(artistMatches('Jungkook', ['Jung Kook'])).toBe(true);
  });

  it('스토어별 현지화 표기 중 하나와 맞으면 일치로 본다', () => {
    expect(artistMatches('방탄소년단', ['BTS', '방탄소년단'])).toBe(true);
    expect(
      artistMatches('宇多田ヒカル', ['Hikaru Utada', '宇多田ヒカル']),
    ).toBe(true);
  });

  it('이름 어순이 달라도 일치로 본다', () => {
    expect(artistMatches('Baek Yerin', ['Yerin Baek'])).toBe(true);
  });

  it('공동 아티스트 중 한 명이면 일치로 본다', () => {
    expect(artistMatches('태연', ['TAEYEON & JONGHYUN', '태연 & 종현'])).toBe(
      true,
    );
    expect(
      artistMatches('윤종신', ['Jung In & Yoon Jong Shin', '정인 & 윤종신']),
    ).toBe(true);
    expect(artistMatches('Jason Mraz', ['Jason Mraz & Colbie Caillat'])).toBe(
      true,
    );
  });

  it('괄호로 병기한 이름도 각각 대조한다', () => {
    expect(artistMatches('백현 (BAEKHYUN)', ['BAEKHYUN'])).toBe(true);
  });

  it('곡명이 같은 커버·연주 아티스트는 거부한다', () => {
    expect(artistMatches('Green Day', ['Rockabye Baby!'])).toBe(false);
    expect(artistMatches('Lana Del Rey', ['Vitamin String Quartet'])).toBe(
      false,
    );
  });

  it('부분 포함은 일치로 보지 않는다', () => {
    expect(artistMatches('Rain', ['Rainbow'])).toBe(false);
  });

  it('한글 음차는 대조하지 않는다 (프롬프트에서 공식 표기를 요구)', () => {
    expect(artistMatches('트와이스', ['TWICE'])).toBe(false);
  });
});

describe('featuredArtists', () => {
  it('곡명 괄호 속 피처링 아티스트를 꺼낸다', () => {
    expect(featuredArtists('Uptown Funk (feat. Bruno Mars)')).toEqual([
      'Bruno Mars',
    ]);
    expect(
      featuredArtists('Life is Beautiful (with Dynamicduo, Zion T & Crush)'),
    ).toEqual(['Dynamicduo, Zion T & Crush']);
  });

  it('꺼낸 이름도 공동 아티스트처럼 대조할 수 있다', () => {
    const names = featuredArtists(
      'Life is Beautiful (with Dynamicduo, Zion T & Crush)',
    );
    expect(artistMatches('Crush', names)).toBe(true);
  });

  it('피처링 표기가 없으면 빈 배열', () => {
    expect(featuredArtists('Dynamite')).toEqual([]);
  });
});
