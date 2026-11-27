import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultPage from '@/pages/ResultPage';
import useAppStore from '@/stores/useAppStore';
import type { EmotionResponse, Track } from '@artune/shared-types';

const track: Track = {
  id: '1',
  name: '밤편지',
  artists: [{ name: '아이유' }],
  album: { name: 'Palette', images: [{ url: '/cover.png' }] },
  preview_url: null,
  appleMusicUrl: '',
  key: '0000000a',
};

/** 심취 곡 하나만 받은 중간 상태 — 완화 곡은 아직 */
const partial: EmotionResponse = {
  emotionLabel: '슬픔',
  description: '많이 지친 하루였네요.',
  crisis: false,
  artwork: { url: '/artwork/sadness.png' },
  playlists: {
    immerse: { modeLabel: '감정 심취', description: '', tracks: [track] },
    soothe: { modeLabel: '감정 완화', description: '', tracks: [] },
  },
};

const WAITING = '곡을 고르고 있어요';
const NOT_FOUND = '플레이리스트를 찾을 수 없어요';

const showSoothe = () =>
  fireEvent.click(screen.getByRole('button', { name: '감정 완화' }));
const trackSlots = () =>
  document.querySelectorAll('[data-skeleton="track"]').length;
const artworkSlot = () => document.querySelector('[data-skeleton="artwork"]');

describe('결과 화면 — 스트림이 열린 뒤 받는 대로 채운다', () => {
  // jsdom에는 matchMedia가 없다 — PC 화면(아트워크·플레이리스트 나란히)
  beforeEach(() =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  afterEach(() => {
    vi.unstubAllGlobals();
    useAppStore.getState().reset();
  });

  it('머리말 전에는 아트워크 자리와 곡 10칸을 스켈레톤으로 두고, 고르는 중이라고 알린다', () => {
    useAppStore.setState({ emotionResult: null, isLoading: true });
    render(<ResultPage />);

    expect(artworkSlot()).not.toBeNull();
    expect(trackSlots()).toBe(10);
    expect(screen.queryByText(WAITING)).not.toBeNull();
    // 토글은 머리말 전에도 기본 이름으로 바로 쓸 수 있다
    screen.getByRole('button', { name: '감정 완화' });
  });

  it('받은 곡은 앞에서부터 칸을 채우고, 남은 칸만 스켈레톤으로 남는다', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: true });
    render(<ResultPage />);

    expect(artworkSlot()).toBeNull(); // 머리말이 왔다
    expect(screen.queryByAltText(track.name)).not.toBeNull();
    expect(trackSlots()).toBe(9);

    showSoothe();

    expect(trackSlots()).toBe(10);
    expect(screen.queryByText(WAITING)).not.toBeNull();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it('끝났는데 10곡이 안 되면 남은 칸과 안내를 지우고, 빈 탭은 찾을 수 없다고 알린다 (도중 실패 포함)', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: false });
    render(<ResultPage />);

    expect(screen.queryByAltText(track.name)).not.toBeNull();
    expect(trackSlots()).toBe(0);
    expect(screen.queryByText(WAITING)).toBeNull();

    showSoothe();

    expect(screen.queryByText(NOT_FOUND)).not.toBeNull();
  });

  it('위기 신호가 있으면 머리말과 함께 상담 안내를 띄운다', () => {
    useAppStore.setState({
      emotionResult: { ...partial, crisis: true },
      isLoading: true,
    });
    render(<ResultPage />);

    screen.getByRole('complementary', { name: '상담 안내' });
  });
});

describe('좁은 화면 — 아트워크 뷰 ↔ 플레이리스트 뷰', () => {
  // 좁은 화면: 아트워크 뷰가 먼저, '음악 보기'로 플레이리스트 뷰
  beforeEach(() =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  afterEach(() => {
    vi.unstubAllGlobals();
    useAppStore.getState().reset();
  });

  it('뷰를 바꾸면 스크롤을 맨 위로 올린다 — 앞 뷰에서 내린 위치로 다음 뷰가 뜨지 않게', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: false });
    const { container } = render(<ResultPage />);
    const scrollArea = container.firstElementChild as HTMLElement;

    scrollArea.scrollTop = 400;
    fireEvent.click(screen.getByRole('button', { name: '음악 보기' }));
    expect(scrollArea.scrollTop).toBe(0);

    scrollArea.scrollTop = 400;
    fireEvent.click(
      screen.getByRole('button', { name: '아트워크로 돌아가기' }),
    );
    expect(scrollArea.scrollTop).toBe(0);
  });
});
