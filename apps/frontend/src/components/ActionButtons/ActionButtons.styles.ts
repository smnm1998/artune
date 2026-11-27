import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const containerStyle = css`
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  width: 100%;
`;

// 기본 버튼 (다시하기) — 바탕보다 살짝 진한 칠
export const buttonStyle = css`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: ${colors.fill.subtle};
  border: none;
  border-radius: 14px;
  color: ${colors.text.primary};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${colors.fill.hover};
  }

  &:active {
    transform: scale(0.98);
  }
`;

// 강조 버튼 (음악 보기) — 초록은 누를 것에만
export const primaryButtonStyle = css`
  background: ${colors.accent.base};
  color: ${colors.text.onAccent};

  &:hover {
    background: ${colors.accent.hover};
  }
`;

// 아이콘은 버튼 글자색을 따른다
export const iconWrapperStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
`;

export const buttonTextStyle = css`
  line-height: 1;
`;
