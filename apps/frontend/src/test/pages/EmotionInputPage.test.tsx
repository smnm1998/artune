import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmotionInputPage from '@/pages/EmotionInputPage';
import useAppStore from '@/stores/useAppStore';

describe('EmotionInputPage', () => {
  const analyzeEmotion = vi.fn(async () => {});

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    useAppStore.setState({ analyzeEmotion });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    useAppStore.setState({ draft: '', isLoading: false });
  });

  const input = () => screen.getByLabelText<HTMLTextAreaElement>('감정 입력');

  it('결과 전에 실패해 돌아오면 보낸 글이 입력창에 그대로 있다', () => {
    useAppStore.setState({ draft: '오늘 시험을 망쳤어' });

    render(<EmotionInputPage />);

    expect(input().value).toBe('오늘 시험을 망쳤어');
  });

  it('보내면 앞뒤 공백을 뺀 글로 분석을 요청한다', () => {
    render(<EmotionInputPage />);

    fireEvent.change(input(), { target: { value: '  기분 좋아요 ^^  ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(analyzeEmotion).toHaveBeenCalledWith('기분 좋아요 ^^');
  });

  it('검증에 걸리면 요청하지 않고 안내를 보여 준다', () => {
    render(<EmotionInputPage />);

    fireEvent.change(input(), { target: { value: '좋아' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(analyzeEmotion).not.toHaveBeenCalled();
    screen.getByText(/최소 5자/); // 없으면 여기서 실패한다
  });

  it('보내는 중에는 다시 보내지 않는다', () => {
    useAppStore.setState({ isLoading: true, draft: '오늘 시험을 망쳤어' });
    render(<EmotionInputPage />);

    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(analyzeEmotion).not.toHaveBeenCalled();
  });
});
