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
    expect(
      titleMatches('Born Hater', 'BORN HATER (feat. B.I, BOBBY & MINO)'),
    ).toBe(true);
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

  it('앞부분만 같은 다른 곡은 거부한다', () => {
    // 로이킴 - 우리 그만 헤어져요 요청에 같은 가수의 '우리 그만하자'가 온 케이스 (11/3 실측)
    expect(titleMatches('우리 그만 헤어져요', '우리 그만하자')).toBe(false);
    expect(titleMatches('Papercut', 'Paranoid Android')).toBe(false);
  });

  it('긴 곡명 속 짧은 단어나 속편 곡명은 일치로 보지 않는다', () => {
    // Lana Del Rey 요청에 Cat Power - Woman (feat. Lana Del Rey)가 온 케이스 (11/3 실측)
    expect(
      titleMatches(
        'Hope Is a Dangerous Thing for a Woman Like Me to Have - But I Have It',
        'Woman (feat. Lana Del Rey)',
      ),
    ).toBe(false);
    expect(titleMatches('Mommae', 'Keep It Sexy (MOMMAE 2)')).toBe(false);
  });

  it('전각 괄호도 같은 표기로 본다', () => {
    // スキマスイッチ - 奏（かなで） 요청, JP 표기는 '奏(かなで)' (11/3 홀드아웃)
    expect(titleMatches('奏（かなで）', '奏(かなで)')).toBe(true);
  });

  it('앞에 붙은 괄호 부제를 빼고도 비교한다', () => {
    // Carpenters - Close to You 요청, 스토어 표기는 '(They Long To Be) Close To You' (11/3 홀드아웃)
    expect(titleMatches('Close to You', '(They Long To Be) Close To You')).toBe(
      true,
    );
    expect(titleMatches('(They Long To Be) Close To You', 'Close to You')).toBe(
      true,
    );
  });

  it('절반 이상 겹치는 중간 포함은 일치로 본다', () => {
    // JP 스토어 표기
    expect(titleMatches('Kick It', '英雄; Kick It')).toBe(true);
  });
});
