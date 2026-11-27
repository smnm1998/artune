import { css, keyframes } from '@emotion/react';
import { colors } from '@/styles/theme';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// 화면 전체 — 위는 내용(가운데), 아래는 닫기 버튼
export const overlayStyle = css`
  position: fixed;
  inset: 0;
  z-index: 1000;
  /* 아래 화면 위에 덧붙인 어두운 막 + 흐림 — 흰 글자가 읽히는 농도(colors.scrim) */
  background: ${colors.scrim};
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
`;

// 내용이 놓이는 남은 높이 — 빈 곳을 누르면 막(overlay)이 받아 닫힌다
export const stageStyle = css`
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 28px 0;
`;

export const contentStyle = css`
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
`;

export const vinylWrapperStyle = css`
  position: relative;
  width: 280px;
  height: 280px;
  max-width: 72vw;
  max-height: 72vw;
  border-radius: 50%;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.14);

  /* 재생 중에만 돈다 */
  animation: ${spin} 9s linear infinite;

  &[data-playing='false'] {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const vinylDiscStyle = css`
  position: absolute;
  inset: 0;
  border-radius: 50%;

  /* 앨범 커버 배경 */
  background-size: cover;
  background-position: center;
  background-color: #111;

  /* CD 홈 무늬 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: repeating-radial-gradient(
      circle at center,
      rgba(0, 0, 0, 0.08) 0 1px,
      rgba(0, 0, 0, 0) 1px 5px
    );
    pointer-events: none;
  }
`;

// 가운데 흰 원 + 작은 구멍
export const centerHoleStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: ${colors.background.surface};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  z-index: 1;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${colors.text.primary};
  }
`;

export const infoStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  text-align: center;
  word-break: keep-all;
`;

export const titleStyle = css`
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${colors.text.inverse};
`;

export const artistStyle = css`
  margin: 0;
  font-size: 15px;
  line-height: 22px;
  color: ${colors.text.inverseSecondary};
`;

export const albumStyle = css`
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: ${colors.text.inverseSecondary};
`;

// 미리듣기 상태 — 배경·테두리 없이 흰 글자. 재생 준비 중에만 깜빡인다
export const statusStyle = css`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: ${colors.text.inverse};
  text-align: center;
  min-height: 20px; /* 비어 있을 때도(재생 전 0.4초) 아래 배지가 움직이지 않게 */

  &[data-waiting='true'] {
    animation: ${pulse} 2s ease-in-out infinite;
  }

  /* 끝까지 들은 뒤 — 한 단계 흐린 흰 글자 */
  &[data-ended='true'] {
    color: ${colors.text.inverseSecondary};
    font-weight: 500;
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-waiting='true'] {
      animation: none;
    }
  }
`;

// 어두운 막 위 막대는 밝은 초록(장식이라 글자 대비 기준 밖)
export const equalizerStyle = css`
  height: 13px;
  color: ${colors.accent.bright};
`;

// 맨 아래 흰 닫기 버튼 — 엄지가 닿는 자리
export const closeBarStyle = css`
  width: 100%;
  max-width: 400px;
  padding: 16px 20px 24px;
`;

export const closeButtonStyle = css`
  width: 100%;
  height: 56px;
  border: none;
  border-radius: 16px;
  background: ${colors.background.surface};
  color: ${colors.text.primary};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${colors.text.inverse};
    outline-offset: 3px;
  }
`;
