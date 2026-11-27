import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MobilePlayerModal from '@/components/MobilePlayerModal/MobilePlayerModal';
import usePreviewAudio from '@/hooks/audio/usePreviewAudio';
import type { Track } from '@/types/track';
import { NOTICES } from '@/constants/notices';

// jsdom은 오디오를 재생하지 못한다 — 재생 상태는 훅을 가짜로 바꿔 정한다 (상수 등 나머지 export는 진짜 그대로)
vi.mock('@/hooks/audio/usePreviewAudio', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: vi.fn(),
}));

const track: Track = {
  id: '1',
  name: '밤편지',
  artists: [{ name: '아이유' }],
  album: { name: 'Palette', images: [{ url: 'https://img/1.jpg' }] },
  preview_url: 'https://audio/1.m4a',
  appleMusicUrl: 'https://music.apple.com/kr/song/1',
  key: '0000000a',
};

const audioState = (isPlaying: boolean) =>
  vi.mocked(usePreviewAudio).mockReturnValue({
    audioRef: { current: null },
    isPlaying,
    error: null,
  } as unknown as ReturnType<typeof usePreviewAudio>);

describe('MobilePlayerModal', () => {
  beforeEach(() => audioState(false));

  it('연 곡의 Apple 배지 링크와 미리듣기 출처를 보여준다', () => {
    render(<MobilePlayerModal isOpen onClose={() => {}} track={track} />);

    const link = screen.getByRole('link', { name: 'Apple Music에서 듣기' });
    expect(link.getAttribute('href')).toBe(track.appleMusicUrl);
    expect(screen.queryByText(NOTICES.PREVIEW_ATTRIBUTION)).not.toBeNull();
  });

  it('곡명 · 가수 · 앨범을 보이고, 재생 중이면 이퀄라이저와 "30초 미리듣기 재생 중"을 띄운다', () => {
    audioState(true);
    render(<MobilePlayerModal isOpen onClose={() => {}} track={track} />);

    screen.getByRole('heading', { name: '밤편지' });
    screen.getByText('아이유');
    screen.getByText('Palette');
    screen.getByText('30초 미리듣기 재생 중');
    expect(screen.getByTestId('equalizer').children).toHaveLength(3);
  });

  it('재생 전 0.4초가 지나면 "재생 준비 중...", 미리듣기가 없는 곡은 안내만 — 막대는 없다', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <MobilePlayerModal isOpen onClose={() => {}} track={track} />,
    );
    expect(screen.queryByText('재생 준비 중...')).toBeNull();
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();
    screen.getByText('재생 준비 중...');
    expect(screen.queryByTestId('equalizer')).toBeNull();

    rerender(
      <MobilePlayerModal
        isOpen
        onClose={() => {}}
        track={{ ...track, preview_url: null }}
      />,
    );
    screen.getByText('미리듣기를 제공하지 않는 곡입니다');
    expect(screen.queryByTestId('equalizer')).toBeNull();
  });

  it('맨 아래 닫기 버튼이나 막의 빈 곳을 누르면 닫히고, 내용(곡 정보)을 눌러서는 닫히지 않는다', () => {
    const onClose = vi.fn();
    render(<MobilePlayerModal isOpen onClose={onClose} track={track} />);

    fireEvent.click(screen.getByText('아이유'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // 막(가장 바깥) — 곡 정보 → 내용 → 남은 높이 상자 → 막
    const overlay = screen
      .getByRole('heading', { name: '밤편지' })
      .closest('div')?.parentElement?.parentElement
      ?.parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
