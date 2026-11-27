import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

// 아트워크 → 감정 정보 — 폭은 담는 쪽(왼쪽 패널 · 좁은 화면 카드)이 정한다
export const artworkContainer = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 20px;
`;

// 아트워크 — 이미지가 오기 전에는 칠 위로 빛이 지나간다
export const artworkWrapper = css`
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: 18px;
  overflow: hidden;
  background: ${colors.fill.skeleton};
  box-shadow: 0 0 0 1px ${colors.border.subtle};

  /* 이미지 로딩 */
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${colors.gradients.shimmer};
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(100%);
    }
  }
`;

export const artworkImage = css`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;

  /* 픽셀아트 컨셉 */
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;

  position: relative;
  z-index: 1;
`;

// 감정 정보 영역 — 왼쪽 정렬(작은 제목 → 감정 이름 → 공감 문구)
export const artworkInfo = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  word-break: keep-all;
`;

// "오늘의 감정"
export const eyebrow = css`
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  color: ${colors.text.tertiary};
`;

// 감정 이름
export const emotionalLabel = css`
  margin: 0;
  font-size: 28px;
  line-height: 38px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${colors.text.primary};
`;

// 공감 문구
export const description = css`
  margin: 6px 0 0;
  font-size: 15px;
  line-height: 25px;
  font-weight: 400;
  color: ${colors.text.secondary};
`;

// 감상 안내 (좁은 화면)
export const guideText = css`
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 20px;
  font-weight: 400;
  color: ${colors.text.tertiary};
`;
