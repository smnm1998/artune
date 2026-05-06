import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { TABLET_BP, MOBILE_BP } from '@/constants/size';

export const cardContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  position: relative;
  width: 100%;
  height: 100%;

  /* 모바일 탭 하이라이트 제거 */
  -webkit-tap-highlight-color: transparent;
`;

// 앨범 + CD 래퍼
export const albumWrapperStyle = css`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: visible;
`;

// CD (모바일에서는 숨김 처리)
export const vinylDiscStyle = css`
  position: absolute;
  top: 0;
  left: 15%;
  width: 100%;
  height: 100%;

  background: ${colors.gradients.hologram}, ${colors.gradients.vinylReflection};
  background-blend-mode: overlay;
  border-radius: 50%;
  border: 1px solid ${colors.border.vinyl};
  box-shadow:
    0 6px 20px ${colors.shadow.medium},
    inset 0 0 50px ${colors.shadow.inset};

  transform: rotate(-20deg);
  z-index: 0;
  transition: filter 0.3s ease;
  pointer-events: none;

  /* [Mobile] 공간 효율을 위해 CD 장식 숨김 */
  @media (max-width: ${TABLET_BP}) {
    display: none;
  }
`;

// CD 중앙 홀
export const vinylCenterStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20%;
  height: 20%;
  background: ${colors.gradients.vinylCenter};
  border-radius: 50%;
  border: 2px solid ${colors.border.vinylCenter};
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8);
`;

// 앨범 커버 이미지
export const albumCoverStyle = css`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 8px 16px ${colors.shadow.medium},
    0 4px 8px ${colors.shadow.light};
  z-index: 1;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    background: ${colors.background.glass.subtle};
  }
`;

// 앨범 텍스트 정보 스타일 생략 (기존 유지)
export const albumNameStyle = css`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${MOBILE_BP}) {
    font-size: 12px;
  }
`;

export const artistNameStyle = css`
  font-size: 12px;
  font-weight: 400;
  color: ${colors.text.secondary};
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${MOBILE_BP}) {
    font-size: 10px;
  }
`;
