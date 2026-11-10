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
  duration_ms: 0,
  preview_url: null,
  appleMusicUrl: '',
  key: '0000000a',
};

/** 심취 곡 하나만 받은 중간 상태 — 완화 곡은 아직 */
const partial: EmotionResponse = {
  emotionLabel: '슬픔',
  description: '많이 지친 하루였네요.',
  crisis: false,
  artwork: { url: '/artwork/sadness.png', prompt: '' },
  playlists: {
    immerse: { modeLabel: '감정 심취', description: '', tracks: [track] },
    soothe: { modeLabel: '감정 완화', description: '', tracks: [] },
  },
};

const WAITING = '곡을 고르고 있어요';
const NOT_FOUND = '플레이리스트를 찾을 수 없어요';

const showSoothe = () =>
  fireEvent.click(screen.getByRole('button', { name: '감정 완화' }));

describe('결과 화면 — 곡을 받는 중', () => {
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

  it('남은 곡을 받는 중이면 아직 빈 탭에 고르는 중 문구를 보여 준다', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: true });
    render(<ResultPage />);

    expect(screen.queryByAltText(track.name)).not.toBeNull(); // 받은 심취 곡 커버
    showSoothe();

    expect(screen.queryByText(WAITING)).not.toBeNull();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it('요청이 끝났는데 빈 탭은 찾을 수 없다고 알린다 (도중에 실패한 경우 포함)', () => {
    useAppStore.setState({ emotionResult: partial, isLoading: false });
    render(<ResultPage />);

    showSoothe();

    expect(screen.queryByText(NOT_FOUND)).not.toBeNull();
    expect(screen.queryByText(WAITING)).toBeNull();
  });
});
