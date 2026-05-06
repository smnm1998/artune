import { css, keyframes } from '@emotion/react';
import { colors } from '@/styles/theme';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const overlayStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

export const contentStyle = css`
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  position: relative;
`;

export const vinylWrapperStyle = css`
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);

  /* 회전 애니메이션 */
  animation: ${spin} 8s linear infinite;

  &[data-playing='false'] {
    animation-play-state: paused;
  }
`;

export const vinylDiscStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;

  /* 앨범 커버 배경 */
  background-size: cover;
  background-position: center;
  background-color: #111;

  /* CD 질감 효과 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: repeating-radial-gradient(
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0.05) 1px,
      transparent 2px,
      transparent 4px
    );
    pointer-events: none;
  }

  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const albumCoverStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #111;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const centerHoleStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px; /* 중앙 원 크기 */
  height: 60px;
  border-radius: 50%;
  background: #f9f9f9; /* 흰색 */
  z-index: 10; /* CD 위에 배치 */

  /* 입체감 효과: 내부 그림자와 외부 그림자 조합 */
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.3),
    /* 안쪽 깊이감 */ 0 4px 8px rgba(0, 0, 0, 0.4); /* 붕 뜬 느낌 */

  /* 중앙 구멍 (더 작은 원) */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: #1a1a1a; /* 구멍 색상 */
    border-radius: 50%;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  }
`;

export const infoStyle = css`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

export const titleStyle = css`
  font-size: 20px;
  font-weight: 700;
  color: ${colors.text.primary};
  line-height: 1.4;
  word-break: keep-all;
`;

export const artistStyle = css`
  font-size: 16px;
  color: ${colors.text.secondary};
`;

export const closeButtonStyle = css`
  margin-top: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${colors.background.glass.light};
  border: 1px solid ${colors.border.light};
  color: ${colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: background 0.2s;

  &:active {
    background: ${colors.background.glass.medium};
  }
`;
