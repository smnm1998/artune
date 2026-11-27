import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export type ToggleSize = 'small' | 'large';

/** 바닥 안쪽 여백 — 미끄러지는 흰 면이 이만큼 들어와 앉는다 */
const INSET: Record<ToggleSize, number> = { small: 3, large: 6 };

// 토글 바닥 — 두 칸은 같은 폭(긴 이름 기준)
export const toggleWrapperStyle = (size: ToggleSize) => css`
  position: relative;
  display: ${size === 'small' ? 'inline-grid' : 'grid'};
  grid-template-columns: 1fr 1fr;
  background: ${colors.fill.subtle};
  border-radius: 12px;
  padding: ${INSET[size]}px;
  ${size === 'large' && 'width: 100%; max-width: 500px;'}
`;

// 고른 칸 — 흰 면 + 얕은 그림자(초록은 누를 것과 재생 중에만 쓴다)
export const sliderStyle = (size: ToggleSize) => css`
  position: absolute;
  top: ${INSET[size]}px;
  left: ${INSET[size]}px;
  width: calc(50% - ${INSET[size]}px);
  height: calc(100% - ${INSET[size] * 2}px);
  background: ${colors.background.surface};
  border-radius: ${size === 'small' ? 9 : 8}px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${colors.shadow.raised};
  pointer-events: none;
  z-index: 0;
`;

export const toggleButtonStyle = (size: ToggleSize) => css`
  position: relative;
  background: transparent;
  border: none;
  color: ${colors.text.tertiary};
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.3s ease;
  z-index: 1;
  ${size === 'small'
    ? 'height: 32px; padding: 0 14px; border-radius: 9px; font-size: 13px;'
    : 'padding: 12px 16px; border-radius: 8px; font-size: 14px;'}

  &:hover {
    color: ${colors.text.secondary};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${colors.text.primary};
    outline-offset: 2px;
  }
`;

export const activeToggleButtonStyle = css`
  color: ${colors.text.primary};

  &:hover {
    color: ${colors.text.primary};
  }
`;

export const modeLabelStyle = css`
  display: block;
  position: relative;
  z-index: 2;
`;
