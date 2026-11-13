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
