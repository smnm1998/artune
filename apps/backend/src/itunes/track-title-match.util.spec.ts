import { titleMatches, normalizeTitle } from './track-title-match.util';

describe('normalizeTitle', () => {
  it('공백·기호·대소문자를 제거해 정규화한다', () => {
    expect(normalizeTitle('Bulls On Parade')).toBe('bullsonparade');
    expect(normalizeTitle('교실 이데아')).toBe('교실이데아');
  });

  it('(feat. ...) 표기를 제거한다', () => {
    expect(normalizeTitle('Born Hater (feat. B.I, BOBBY)')).toBe('bornhater');
    expect(normalizeTitle('Eight feat. SUGA')).toBe('eight');
  });
});

describe('titleMatches', () => {
  it('버전/부제 표기 차이를 흡수한다 (부분 포함)', () => {
    // 요청: "Toxicity" ⊂ 응답: "Toxicity (Live)"
    expect(titleMatches('Toxicity', 'Toxicity (Live)')).toBe(true);
    expect(titleMatches('Dada', 'Dada (dadadada Ver.)')).toBe(true);
    expect(titleMatches('Bulls on Parade', 'Bulls On Parade (Live)')).toBe(
      true,
    );
  });

  it('feat 표기가 달라도 매칭한다', () => {
    expect(titleMatches('Born Hater', 'BORN HATER (feat. B.I, BOBBY & MINO)')).toBe(
      true,
    );
  });

  it('한글 곡명도 매칭한다', () => {
    expect(titleMatches('기억을 걷는 시간', '기억을 걷는 시간')).toBe(true);
    expect(titleMatches('교실이데아', '교실 이데아')).toBe(true);
  });

  it('완전히 다른 곡은 거부한다 (조용한 실패 방어)', () => {
    // 이센스 - 불꽃 요청에 민광 - First Love가 온 케이스
    expect(titleMatches('불꽃', 'First Love')).toBe(false);
    // 정원영 - 바람 요청에 아이유 - 에잇이 온 케이스
    expect(titleMatches('바람', '에잇')).toBe(false);
    // 한동일 - 녹턴 요청에 낙서가 온 케이스
    expect(titleMatches('녹턴', '낙서')).toBe(false);
  });

  it('빈 문자열은 매칭하지 않는다', () => {
    expect(titleMatches('', 'Something')).toBe(false);
    expect(titleMatches('Something', '')).toBe(false);
  });

  it('접두 근사매칭은 최소 길이를 요구해 짧은 무관 제목을 막는다', () => {
    // 서로 포함관계가 아니고 접두도 다르면 거부
    expect(titleMatches('Papercut', 'Paranoid Android')).toBe(false);
    expect(titleMatches('녹턴', '낙서')).toBe(false);
  });
});
