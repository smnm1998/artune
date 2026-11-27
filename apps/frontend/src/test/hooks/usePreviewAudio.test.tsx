import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import usePreviewAudio from '@/hooks/audio/usePreviewAudio';

const SRC = 'https://audio/preview.m4a';

function Player({ isEnabled }: { isEnabled: boolean }) {
  const { audioRef, isEnded } = usePreviewAudio({
    src: SRC,
    isEnabled,
    fadeOutSeconds: 2,
  });
  return (
    <>
      <audio ref={audioRef} src={SRC} data-testid="audio" />
      <p data-testid="ended">{String(isEnded)}</p>
    </>
  );
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

  // 끝나고 멈추면 isPlaying만으로는 '아직 안 틀었음'과 구별이 안 돼 화면이 '재생 준비 중'으로 돌아갔다 (11/27)
  it('끝 2초 전 페이드가 다 끝나면 isEnded — 닫거나 다시 열면 처음으로', async () => {
    const ended = () => screen.getByTestId('ended').textContent;
    const { rerender } = render(<Player isEnabled />);
    open();
    await canPlay();
    expect(ended()).toBe('false');

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    Object.defineProperty(audio, 'duration', { value: 30, configurable: true });
    audio.currentTime = 28.5; // 1.5초 남음 → 페이드 시작
    act(() => {
      audio.dispatchEvent(new Event('timeupdate'));
    });
    act(() => vi.advanceTimersByTime(50)); // 페이드 한 프레임 — 멈춰 있어(가짜 pause) 바로 끝난다
    expect(ended()).toBe('true');

    rerender(<Player isEnabled={false} />);
    expect(ended()).toBe('false');
    rerender(<Player isEnabled />);
    expect(ended()).toBe('false');
  });
});
