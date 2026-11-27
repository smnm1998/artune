import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmotionInput from '@/components/EmotionInput/EmotionInput';

describe('EmotionInput — Enter로 보내기', () => {
  beforeEach(() =>
    // jsdom에는 matchMedia가 없다 (placeholder 길이만 바뀐다)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  afterEach(() => vi.unstubAllGlobals());

  const setup = () => {
    const onSubmit = vi.fn();
    render(
      <EmotionInput
        value="오늘 안녕"
        onChange={() => {}}
        onSubmit={onSubmit}
      />,
    );
    return { onSubmit, input: screen.getByLabelText('감정 입력') };
  };

  it('Enter를 누르면 보낸다', () => {
    const { onSubmit, input } = setup();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Shift+Enter는 줄바꿈이라 보내지 않는다', () => {
    const { onSubmit, input } = setup();

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('한글 조합 중 Enter는 마지막 글자를 확정하는 키라 보내지 않는다', () => {
    const { onSubmit, input } = setup();

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Safari처럼 조합 중 Enter가 keyCode 229로 와도 보내지 않는다', () => {
    const { onSubmit, input } = setup();

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('EmotionInput — 글자 수', () => {
  beforeEach(() =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  afterEach(() => vi.unstubAllGlobals());

  const renderWith = (value: string) =>
    render(
      <EmotionInput
        value={value}
        onChange={() => {}}
        onSubmit={() => {}}
        maxLength={500}
      />,
    );
  // 모바일 테두리의 채워지는 선 — 둘레 한 바퀴를 100으로 잰다
  const ringFill = (container: HTMLElement) =>
    container
      .querySelector('rect[pathLength]')
      ?.getAttribute('stroke-dasharray');

  it('모바일 테두리는 최대 글자 수 대비 비율만큼 채워진다', () => {
    const { container } = renderWith('가'.repeat(125));

    expect(ringFill(container)).toBe('25 100');
  });

  it('최대 글자 수면 한 바퀴를 넘지 않는다', () => {
    const { container } = renderWith('가'.repeat(600));

    expect(ringFill(container)).toBe('100 100');
  });

  it('글자 수는 입력창 설명으로 연결돼 화면 읽기 프로그램이 읽는다', () => {
    renderWith('오늘 안녕');

    const describedBy = screen
      .getByLabelText('감정 입력')
      .getAttribute('aria-describedby');
    expect(describedBy).toContain('emotion-input-count');
    expect(screen.getByText('5 / 500자').id).toBe('emotion-input-count');
  });
});
