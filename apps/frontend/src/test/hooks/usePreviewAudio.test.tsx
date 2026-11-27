import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import usePreviewAudio from '@/hooks/audio/usePreviewAudio';

const SRC = 'https://audio/preview.m4a';

function Player({ isEnabled }: { isEnabled: boolean }) {
  const { audioRef } = usePreviewAudio({ src: SRC, isEnabled });
  return <audio ref={audioRef} src={SRC} data-testid="audio" />;
}

// jsdom은 오디오를 재생하지 못한다 — play·pause를 흉내 내고 이벤트는 직접 보낸다
describe('usePreviewAudio', () => {
  let play: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const open = () => act(() => vi.advanceTimersByTime(100)); // 디바운스
  const canPlay = () =>
    act(async () => {
      screen.getByTestId('audio').dispatchEvent(new Event('canplay'));
    });

  // 브라우저는 끝난 미리듣기를 되감으면(currentTime = 0) canplay를 다시 보낸다(크롬 확인, 11/11)
  it('한 번 연 동안에는 canplay가 다시 와도 한 번만 재생한다', async () => {
    render(<Player isEnabled />);
    open();

    await canPlay();
    await canPlay(); // 끝나고 되감은 뒤 다시 온 canplay

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('닫았다가 다시 열면 다시 재생한다', async () => {
    const { rerender } = render(<Player isEnabled />);
    open();
    await canPlay();

    rerender(<Player isEnabled={false} />);
    open();
    rerender(<Player isEnabled />);
    open();
    await canPlay();

    expect(play).toHaveBeenCalledTimes(2);
  });
});
