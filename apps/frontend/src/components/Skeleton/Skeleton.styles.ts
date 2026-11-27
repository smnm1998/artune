import { css, keyframes } from '@emotion/react';
import { colors } from '@/styles/theme';

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

// 곡 카드 자리 — 받은 곡 카드의 커버와 같은 정사각형
export const cover = css`
  ${shimmer};
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid ${colors.border.subtle};
  box-sizing: border-box;
`;

// 머리말 자리 — ArtworkDisplay와 같은 틀
export const artworkContainer = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
`;

export const artworkSquare = css`
  ${shimmer};
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  border: 1px solid ${colors.border.subtle};
  box-sizing: border-box;
`;

export const artworkInfo = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

/** 글줄 자리 — 감정 이름(굵고 짧게) · 공감 문구(두 줄) */
export const line = (width: string, height: number) => css`
  ${shimmer};
  width: ${width};
  height: ${height}px;
  border-radius: 6px;
`;
