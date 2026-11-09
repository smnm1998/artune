import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobilePlayerModal from '@/components/MobilePlayerModal/MobilePlayerModal';
import type { Track } from '@/types/track';
import { NOTICES } from '@/constants/notices';

const track: Track = {
  id: '1',
  name: '밤편지',
  artists: [{ name: '아이유' }],
  album: { name: 'Palette', images: [{ url: 'https://img/1.jpg' }] },
  duration_ms: 0,
  preview_url: null, // jsdom은 오디오를 재생하지 못한다
  appleMusicUrl: 'https://music.apple.com/kr/song/1',
  key: '0000000a',
};

describe('MobilePlayerModal', () => {
  it('연 곡의 Apple 배지 링크와 미리듣기 출처를 보여준다', () => {
    render(<MobilePlayerModal isOpen onClose={() => {}} track={track} />);

    const link = screen.getByRole('link', { name: 'Apple Music에서 듣기' });
    expect(link.getAttribute('href')).toBe(track.appleMusicUrl);
    expect(screen.queryByText(NOTICES.PREVIEW_ATTRIBUTION)).not.toBeNull();
  });
});
