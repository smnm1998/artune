import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useIsPresent } from 'framer-motion';
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

/** 곡 n개를 받은 상태 — 모드 설명은 머리말(meta)과 함께 온다 */
const tracksOf = (n: number): Track[] =>
  Array.from({ length: n }, (_, i) => ({
    ...track,
    id: String(i + 1),
    name: `곡 ${i + 1}`,
    key: (i + 1).toString(16).padStart(8, '0'),
  }));
const withTracks = (n: number): EmotionResponse => ({
  ...partial,
  playlists: {
    immerse: {
      modeLabel: '감정 심취',
      description: '지친 마음에 조용히 머무는 곡들이에요',
      tracks: tracksOf(n),
    },
    soothe: {
      modeLabel: '감정 완화',
      description: '천천히 숨을 고르게 해 줄 곡들이에요',
      tracks: [],
    },
  },
});

const WAITING = '곡을 고르고 있어요';
const FEATURED = '먼저 들어보세요';
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

  it('PC는 첫 곡을 소개 카드로 크게, 나머지는 그 아래 격자로 둔다 (첫 곡이 오기 전에는 소개 카드도 스켈레톤)', () => {
    useAppStore.setState({ emotionResult: null, isLoading: true });
    const { rerender } = render(<ResultPage />);

    // 듣는 법 안내는 곡보다 먼저 보인다 — 기다리는 동안 읽게
    screen.getByText(FEATURED);
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();

    act(() => useAppStore.setState({ emotionResult: withTracks(3) }));
    rerender(<ResultPage />);

    expect(
      screen.getByRole('heading', { level: 3, name: '곡 1' }),
    ).not.toBeNull();
    // 격자에는 2번째 곡부터 — 커버 아래 곡명이 붙는다
    expect(screen.queryAllByText('곡 1', { selector: 'p' })).toHaveLength(0);
    screen.getByText('곡 2', { selector: 'p' });
    screen.getByText('곡 3', { selector: 'p' });
    expect(trackSlots()).toBe(7);
  });

  it('모드 설명은 제목 아래 문장으로 늘 보이고, 고르는 중에는 받은 곡 수를 함께 보인다', () => {
    useAppStore.setState({ emotionResult: withTracks(3), isLoading: true });
    render(<ResultPage />);

    screen.getByText('지친 마음에 조용히 머무는 곡들이에요');
    expect(screen.getByRole('status').textContent).toContain('3 / 10');

    showSoothe();

    screen.getByText('천천히 숨을 고르게 해 줄 곡들이에요');
    expect(screen.getByRole('status').textContent).toContain('0 / 10');
    expect(
      screen
        .getByRole('button', { name: '감정 완화' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('ARTUNE을 누르면 다시하기처럼 묻고, 확인했을 때만 처음 화면으로 간다', () => {
    useAppStore.setState({
      emotionResult: partial,
      isLoading: false,
      currentPage: 'result',
    });
    render(<ResultPage />);
    const home = screen.getByRole('link', { name: /ARTUNE/ });

    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    fireEvent.click(home);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().currentPage).toBe('result');

    confirm.mockReturnValue(true);
    fireEvent.click(home);
    expect(useAppStore.getState().currentPage).toBe('input');
  });
});

describe('좁은 화면 — 아트워크 뷰 ↔ 플레이리스트 뷰', () => {
  // 좁은 화면: 아트워크 뷰가 먼저, '추천곡 보기'로 플레이리스트 뷰
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
    fireEvent.click(screen.getByRole('button', { name: '추천곡 보기' }));
    expect(scrollArea.scrollTop).toBe(0);

    scrollArea.scrollTop = 400;
    fireEvent.click(
      screen.getByRole('button', { name: '아트워크로 돌아가기' }),
    );
    expect(scrollArea.scrollTop).toBe(0);
  });

  it('감정 결과 뷰는 맨 위에 ARTUNE을 두고, 추천곡 뷰는 뒤로 · 토글이 맨 위라 로고가 없다', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: false });
    render(<ResultPage />);
    screen.getByRole('link', { name: /ARTUNE/ });

    fireEvent.click(screen.getByRole('button', { name: '추천곡 보기' }));

    expect(screen.queryByRole('link', { name: /ARTUNE/ })).toBeNull();
    screen.getByRole('button', { name: '아트워크로 돌아가기' });
  });

  it('좁은 화면 플레이리스트 뷰는 소개 카드 없이 10곡을 같은 격자로 둔다', () => {
    useAppStore.setState({ emotionResult: withTracks(3), isLoading: true });
    render(<ResultPage />);
    fireEvent.click(screen.getByRole('button', { name: '추천곡 보기' }));

    expect(screen.queryByText(FEATURED)).toBeNull();
    screen.getByText('곡 1', { selector: 'p' });
    expect(trackSlots()).toBe(7);
  });
});

describe('교차 페이드 — 결과 화면이 사라지는 동안', () => {
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
    vi.mocked(useIsPresent).mockReturnValue(true);
    useAppStore.getState().reset();
  });

  it('다시하기로 결과가 비워져도 사라지는 동안에는 마지막 결과를 그대로 보여 준다', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: false });
    render(<ResultPage />);

    // App의 AnimatePresence가 결과 화면을 내보내는 중 — 같은 렌더에서 스토어는 결과를 비운다
    vi.mocked(useIsPresent).mockReturnValue(false);
    act(() => useAppStore.getState().reset());

    expect(screen.queryByText(partial.emotionLabel)).not.toBeNull();
  });

  it('화면에 남아 있는 동안 결과가 비워지면 그대로 비운다 (사라지는 중일 때만 붙잡는다)', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: false });
    render(<ResultPage />);

    act(() => useAppStore.getState().reset());

    expect(screen.queryByText(partial.emotionLabel)).toBeNull();
  });
});
