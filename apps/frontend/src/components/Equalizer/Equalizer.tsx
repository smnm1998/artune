import { css, keyframes } from '@emotion/react';

const equalize = keyframes`
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
`;

// 막대 셋이 바닥을 기준으로 0.35 ↔ 1배로, 서로 엇갈려 오르내린다. 높이 기본 14px — 쓰는 쪽이 css로 바꾼다
const equalizerStyle = css`
  display: inline-flex;
  flex: none;
  align-items: flex-end;
  gap: 2px;
  height: 14px;

  span {
    width: 3px;
    height: 100%;
    border-radius: 2px;
    background: currentColor;
    transform-origin: bottom;
    animation: ${equalize} 1s ease-in-out infinite;
  }

  span:nth-of-type(2) {
    animation-delay: -0.35s;
  }

  span:nth-of-type(3) {
    animation-delay: -0.7s;
  }

  /* 움직임 줄이기 — 높이를 엇갈린 채로 멈춘다 */
  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
    }
    span:nth-of-type(1) {
      transform: scaleY(0.6);
    }
    span:nth-of-type(3) {
      transform: scaleY(0.8);
    }
  }
`;

/**
 * 재생 중 표시 — 막대 셋(목업). 색은 감싼 글자색(currentColor)을 따르고, 높이·색은 css prop으로 덮는다
 * (PC 호버 카드: 초록 14 · 소개 카드 12 / 모바일 플레이어: 어두운 막 위 밝은 초록 13)
 */
function Equalizer({ className }: { className?: string }) {
  return (
    <span
      css={equalizerStyle}
      className={className}
      data-testid="equalizer"
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  );
}

export default Equalizer;
