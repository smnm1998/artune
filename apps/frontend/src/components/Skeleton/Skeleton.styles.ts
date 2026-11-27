import { css, keyframes } from '@emotion/react';
import { colors } from '@/styles/theme';
import { BREAKPOINTS } from '@/constants/breakpoints';

const COMPACT = `@media (max-width: ${BREAKPOINTS.compact}px)`;

const sweep = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
`;

/** 회색 칠 위로 흰 빛이 지나간다 — 움직임 줄이기 설정이면 멈춘다 */
const shimmer = css`
  position: relative;
  overflow: hidden;
  background: ${colors.fill.skeleton};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${colors.gradients.shimmer};
    animation: ${sweep} 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
    }
  }
`;

// 커버 자리 — 받은 곡 커버와 같은 정사각형 · 같은 모서리
export const cover = css`
  ${shimmer};
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  border: 1px solid ${colors.border.subtle};
  box-sizing: border-box;

  ${COMPACT} {
    border-radius: 12px;
  }
`;

// 격자 곡 칸 — 받은 곡 칸(커버 + 곡명 · 가수)과 같은 틀
export const trackSlot = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;

  ${COMPACT} {
    gap: 10px;
  }
`;

export const trackLines = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 3px 2px 0;
`;

// 머리말 자리 — ArtworkDisplay와 같은 틀
export const artworkContainer = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 20px;
`;

export const artworkSquare = css`
  ${shimmer};
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  border: 1px solid ${colors.border.subtle};
  box-sizing: border-box;

  ${COMPACT} {
    border-radius: 24px;
  }
`;

export const artworkInfo = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

/** 글줄 자리 — 감정 이름(굵고 짧게) · 공감 문구(두 줄) · 곡명 · 가수 */
export const line = (width: string, height: number) => css`
  ${shimmer};
  width: ${width};
  height: ${height}px;
  border-radius: ${height / 2}px;
`;
