import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

// 전체 컨테이너
export const artworkContainer = css`
  display: flex;
  flex-direction: column;
  max-width: 500px;
  gap: 20px;
  padding: 20px;
`;

// 아트워크
export const artworkWrapper = css`
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  background: ${colors.background.glass.subtle};
  border: 1px solid ${colors.border.light};
  box-shadow: 0 8px 32px ${colors.shadow.light};

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

// 감정 정보 영역
export const artworkInfo = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
`;

// 감정 설명
export const emotionalLabel = css`
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: ${colors.text.primary};
  text-shadow: 0 2px 8px ${colors.shadow.light};
`;

export const description = css`
  font-size: 16px;
  font-weight: 400;
  margin: 0;
  color: ${colors.text.tertiary};
  line-height: 1.5;
`;

// 안내 문구
export const guideText = css`
  font-size: 14px;
  font-weight: 500;
  color: rgba(249, 249, 249, 0.8);
  line-height: 1.6;
  margin-top: 8px;
  font-style: italic;
`;
