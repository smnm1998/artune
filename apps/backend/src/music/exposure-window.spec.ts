import { ExposureWindow } from './exposure-window';

describe('ExposureWindow', () => {
  it('목록이 5개 쌓이기 전에는 머리 곡이 없다 (재시작 직후)', () => {
    const window = new ExposureWindow();
    for (let i = 0; i < 4; i++)
      window.record('soothe', ['sunrise', `only-${i}`]);
    expect(window.heads('soothe').size).toBe(0);

    window.record('soothe', ['sunrise', 'only-4']);
    expect(window.heads('soothe')).toContain('sunrise');
  });

  it('최근 목록의 15% 이상에 나온 곡이 머리 곡이다 (20목록 중 3번은 포함, 2번은 아님)', () => {
    const window = new ExposureWindow();
    for (let i = 0; i < 20; i++) {
      const keys = [`only-${i}`];
      if (i < 3) keys.push('sunrise');
      if (i < 2) keys.push('upside-down');
      window.record('soothe', keys);
    }
    expect(window.heads('soothe')).toEqual(new Set(['sunrise']));
  });

  it('30목록을 넘으면 오래된 목록부터 잊는다', () => {
    const window = new ExposureWindow();
    for (let i = 0; i < 5; i++) window.record('soothe', ['sunrise']);
    for (let i = 0; i < 25; i++) window.record('soothe', [`only-${i}`]);
    expect(window.heads('soothe')).toContain('sunrise'); // 30목록 중 5번 = 17%

    window.record('soothe', ['only-25']);
    expect(window.heads('soothe')).not.toContain('sunrise'); // 첫 목록이 빠져 30목록 중 4번 = 13%
  });

  it('심취와 완화는 따로 센다', () => {
    const window = new ExposureWindow();
    for (let i = 0; i < 5; i++) {
      window.record('soothe', ['sunrise']);
      window.record('immerse', ['one-page']);
    }
    expect(window.heads('soothe')).toEqual(new Set(['sunrise']));
    expect(window.heads('immerse')).toEqual(new Set(['one-page']));
  });

  it('기준을 바꿔 만들 수 있다 (테스트·측정 재생용)', () => {
    const window = new ExposureWindow({ warmup: 1, threshold: 0.5 });
    window.record('soothe', ['sunrise']);
    expect(window.heads('soothe')).toContain('sunrise');

    window.record('soothe', ['only-1']);
    window.record('soothe', ['only-2']);
    expect(window.heads('soothe')).not.toContain('sunrise'); // 3목록 중 1번 = 33%
  });
});
