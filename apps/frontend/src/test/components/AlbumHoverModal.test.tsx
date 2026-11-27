import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AlbumHoverModal from '@/components/AlbumHoverModal/AlbumHoverModal';
import usePreviewAudio from '@/hooks/audio/usePreviewAudio';
import type { Track } from '@/types/track';

// jsdom은 오디오를 재생하지 못한다 — 재생 상태는 훅을 가짜로 바꿔 정한다 (상수 등 나머지 export는 진짜 그대로)
vi.mock('@/hooks/audio/usePreviewAudio', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: vi.fn(),
}));

const track: Track = {
  id: '1',
  name: '밤편지',
  artists: [{ name: '아이유' }],
  album: { name: 'Palette', images: [{ url: '/cover.png' }] },
  preview_url: 'https://audio/1.m4a',
  appleMusicUrl: 'https://music.apple.com/kr/song/1',
  key: '0000000a',
};

const audioState = (state: { isPlaying: boolean; error?: string | null }) =>
  vi.mocked(usePreviewAudio).mockReturnValue({
    audioRef: { current: null },
    error: null,
    ...state,
  } as unknown as ReturnType<typeof usePreviewAudio>);

describe('AlbumHoverModal — 미리듣기 상태 줄 (PC 호버 카드)', () => {
  afterEach(() => vi.mocked(usePreviewAudio).mockReset());

  it('재생 중이면 이퀄라이저 막대와 "30초 미리듣기 재생 중"을 보이고, 깜빡이지 않는다', () => {
    audioState({ isPlaying: true });
    render(<AlbumHoverModal isOpen album={track} />);

    const label = screen.getByText('30초 미리듣기 재생 중');
    const equalizer = screen.getByTestId('equalizer');
    expect(equalizer.children).toHaveLength(3);
    expect(equalizer.getAttribute('aria-hidden')).toBe('true');
    expect(label.parentElement?.getAttribute('data-waiting')).toBe('false');
  });

  it('받는 중이 0.4초를 넘기면 그때 "재생 준비 중..."이 깜빡인다 — 그 전에는 빈 줄 (금방 재생되면 준비 중을 건너뛴다)', () => {
    vi.useFakeTimers();
    try {
      audioState({ isPlaying: false });
      render(<AlbumHoverModal isOpen album={track} />);

      expect(screen.queryByText('재생 준비 중...')).toBeNull();
      act(() => vi.advanceTimersByTime(399));
      expect(screen.queryByText('재생 준비 중...')).toBeNull();

      act(() => vi.advanceTimersByTime(1));
      const label = screen.getByText('재생 준비 중...');
      expect(screen.queryByTestId('equalizer')).toBeNull();
      expect(label.parentElement?.getAttribute('data-waiting')).toBe('true');
    } finally {
      vi.useRealTimers();
    }
  });
});
