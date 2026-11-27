import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { MEDIA } from '@/constants/breakpoints';

// 커버 칸 — 정사각형. 호버 정보 카드(AlbumHoverModal)가 이 칸 위에 겹치고, 열리면 둘이 함께 살짝 커진다
export const coverSlotStyle = css`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  /* aspect-ratio 상자는 min-height: auto면 내용물보다 작아지지 않는다 → 세로형 커버(예: 414x600)가 틀을 늘림.
     0으로 두면 정사각형이 유지되고 넘친 부분은 커버의 object-fit: cover가 잘라 준다 */
  min-height: 0;
  transition: transform 0.3s ease;

  &[data-open='true'] {
    transform: scale(1.03);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// 앨범 커버
export const albumCoverStyle = css`
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: ${colors.fill.skeleton};
  box-shadow: ${colors.shadow.cover};
  -webkit-tap-highlight-color: transparent;

  ${MEDIA.compact} {
    border-radius: 12px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

// 커버 주소가 없는 곡
export const noImageStyle = css`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.text.tertiary};
  font-size: 12px;
`;
