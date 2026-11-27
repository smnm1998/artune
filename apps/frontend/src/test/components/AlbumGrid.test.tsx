import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlbumGrid from '@/components/AlbumGrid/AlbumGrid';
import type { Track } from '@/types/track';

// 미리듣기 없음(preview_url null) — jsdom은 오디오를 재생하지 못한다
const track = (n: number): Track => ({
  id: String(n),
  name: `곡 ${n}`,
  artists: [{ name: `가수 ${n}` }],
  album: { name: `앨범 ${n}`, images: [{ url: `https://img/${n}.jpg` }] },
  preview_url: null,
  appleMusicUrl: `https://music.apple.com/kr/song/${n}`,
  key: n.toString(16).padStart(8, '0'),
});

const badges = () =>
  screen.queryAllByRole('link', { name: 'Apple Music에서 듣기' });

describe('AlbumGrid (PC 호버)', () => {
  it('Apple 배지는 마우스를 올린 곡에만, 화면에 하나만 나온다 (가이드라인: 배지 1개)', async () => {
    const user = userEvent.setup();
    render(
      <AlbumGrid tracks={[track(1), track(2), track(3)]} interaction="hover" />,
    );

    expect(badges()).toHaveLength(0);

    await user.hover(screen.getByAltText('곡 2'));
    expect(badges()).toHaveLength(1);
    expect(badges()[0].getAttribute('href')).toBe(
      'https://music.apple.com/kr/song/2',
    );

    await user.hover(screen.getByAltText('곡 3'));
    expect(badges()).toHaveLength(1);
    expect(badges()[0].getAttribute('href')).toBe(
      'https://music.apple.com/kr/song/3',
    );

    await user.unhover(screen.getByAltText('곡 3'));
    expect(badges()).toHaveLength(0);
  });

  it('소개 카드와 격자는 같은 호버 상태를 써서, 둘을 오가도 배지는 하나다', async () => {
    const user = userEvent.setup();
    render(
      <AlbumGrid
        tracks={[track(1), track(2), track(3)]}
        interaction="hover"
        featureFirst
      />,
    );

    await user.hover(screen.getByAltText('곡 1'));
    expect(badges()).toHaveLength(1);
    expect(badges()[0].getAttribute('href')).toBe(
      'https://music.apple.com/kr/song/1',
    );

    await user.hover(screen.getByAltText('곡 2'));
    expect(badges()).toHaveLength(1);
    expect(badges()[0].getAttribute('href')).toBe(
      'https://music.apple.com/kr/song/2',
    );
  });
});

describe('AlbumGrid (좁은 화면 탭)', () => {
  it('누르면 그 곡으로 플레이어를 열고, 커버 위 정보 카드는 띄우지 않는다', async () => {
    const user = userEvent.setup();
    const onTrackClick = vi.fn();
    render(
      <AlbumGrid
        tracks={[track(1), track(2)]}
        interaction="tap"
        onTrackClick={onTrackClick}
      />,
    );

    await user.click(screen.getByAltText('곡 2'));

    expect(onTrackClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2' }),
    );
    expect(badges()).toHaveLength(0);
  });
});
