import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { MOBILE_BP } from '@/constants/size';

export const modalOverlayStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

// 모달 콘텐츠
export const modalContentStyle = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

// 앨범 타이틀
export const albumTitleStyle = css`
  font-size: 16px;
  font-weight: 700;
  color: ${colors.text.primary};
  line-height: 1.4;

  // 긴 제목 처리
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${MOBILE_BP}) {
    font-size: 14px;
  }
`;

// 앨범 정보
export const albumInfoStyle = css`
  font-size: 16px;
  font-weight: 700;
  color: ${colors.text.primary};
  line-height: 1.4;

  // 긴 제목 처리
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// 아티스트 이름
export const artistNameStyle = css`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.text.secondary};
  line-height: 1.3;

  @media (max-width: ${MOBILE_BP}) {
    font-size: 13px;
  }
`;

// 대표곡
export const trackNameStyle = css`
  font-size: 13px;
  font-weight: 400;
  color: ${colors.text.secondary};
  line-height: 1.3;

  // 긴 제목 처리
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${MOBILE_BP}) {
    font-size: 12px;
  }
`;

// 재생 중 표시
export const playingIndicatorStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${colors.accent.green};
  font-size: 12px;
  font-weight: 600;

  // 애니메이션 처리
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  @media (max-width: ${MOBILE_BP}) {
    font-size: 10px;
  }
`;
