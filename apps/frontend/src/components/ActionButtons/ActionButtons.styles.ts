import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { BREAKPOINTS } from '@/constants/breakpoints';

const COMPACT = `@media (max-width: ${BREAKPOINTS.compact}px)`;

export const containerStyle = css`
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  width: 100%;

  ${COMPACT} {
    gap: 8px;
  }
`;

// 기본 버튼 (다시하기) — 바탕보다 살짝 진한 칠
export const buttonStyle = css`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
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

  &:focus-visible {
    outline: 2px solid ${colors.text.primary};
    outline-offset: 2px;
  }

  /* 좁은 화면: 엄지로 누르는 큰 버튼 — 다시하기는 바탕 위 유리 */
  ${COMPACT} {
    min-height: 56px;
    border-radius: 16px;
    font-size: 16px;
    background: ${colors.glass.panel};
    backdrop-filter: ${colors.glass.blur};
    -webkit-backdrop-filter: ${colors.glass.blur};
    border: 1px solid ${colors.border.subtle};
    box-shadow: 0 1px 2px rgba(25, 31, 40, 0.04);

    &:hover {
      background: ${colors.glass.panel};
    }
  }
`;

// 강조 버튼 (추천곡 보기) — 초록은 누를 것에만. 좁은 화면에서 다시하기의 두 배 폭
export const primaryButtonStyle = css`
  background: ${colors.accent.base};
  color: ${colors.text.onAccent};

  &:hover {
    background: ${colors.accent.hover};
  }

  ${COMPACT} {
    flex: 2;
    font-size: 17px;
    font-weight: 700;
    border: none;
    background: ${colors.accent.base};

    &:hover {
      background: ${colors.accent.hover};
    }
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
