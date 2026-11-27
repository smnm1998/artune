import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import EmotionInputPage from '@/pages/EmotionInputPage';
import ResultPage from '@/pages/ResultPage';
import useAppStore from '@/stores/useAppStore';
import type { EmotionResponse } from '@artune/shared-types';
import { NOTICES } from '@/constants/notices';

const result: EmotionResponse = {
  emotionLabel: '슬픔',
  description: '많이 지친 하루였네요.',
  crisis: false,
  artwork: { url: '/artwork/sadness.png' },
  playlists: {
    immerse: { modeLabel: '감정 심취', description: '', tracks: [] },
    soothe: { modeLabel: '감정 완화', description: '', tracks: [] },
  },
};

/** 화면에 보이는 맨 아래 푸터(contentinfo 랜드마크) — 숨긴 요소는 역할 조회에서 빠진다 */
const footer = () => within(screen.getByRole('contentinfo'));

/** jsdom에는 matchMedia가 없다 — compact면 좁은 화면(아트워크 뷰가 먼저 나옴) */
const stubViewport = (compact: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: compact,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

describe('고지 문구', () => {
  beforeEach(() => stubViewport(false));
  afterEach(() => {
    vi.unstubAllGlobals();
    useAppStore.getState().reset();
  });

  it('입력 화면: 쓰기 전에 생성형 AI 서비스임을 알린다 (사전 고지)', () => {
    render(<EmotionInputPage />);

    expect(footer().queryByText(NOTICES.AI_BEFORE_USE)).not.toBeNull();
  });

  it('입력 화면에는 Apple 상표가 없으므로 상표 문구도 없다', () => {
    render(<EmotionInputPage />);

    expect(screen.queryByText(NOTICES.TRADEMARK)).toBeNull();
  });

  describe('결과 화면', () => {
    beforeEach(() => useAppStore.setState({ emotionResult: result }));

    it.each([
      ['PC', false],
      ['좁은 화면(아트워크 뷰)', true],
    ])('%s: AI 결과 표시와 상표 문구가 한 번씩 나온다', (_, compact) => {
      stubViewport(compact);
      render(<ResultPage />);

      expect(footer().queryByText(NOTICES.AI_RESULT)).not.toBeNull();
      expect(footer().queryByText(NOTICES.TRADEMARK)).not.toBeNull();
      // 상표 문구는 사이트에 한 번 (Apple Music 가이드라인)
      expect(screen.getAllByText(NOTICES.TRADEMARK)).toHaveLength(1);
    });
  });
});
