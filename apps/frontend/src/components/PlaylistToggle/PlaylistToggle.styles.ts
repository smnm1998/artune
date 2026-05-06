import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

// 전체 컨테이너
export const toggleContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 500px;
`;

// 토글 버튼 래퍼
export const toggleWrapperStyle = css`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  background: ${colors.background.glass.subtle};
  backdrop-filter: blur(10px);
  border: 1px solid ${colors.border.light};
  border-radius: 12px;
  padding: 6px;
  overflow: visible;
`;

// 슬라이딩 인디케이터
export const sliderStyle = css`
  position: absolute;
  top: 6px;
  left: 6px;
  width: calc(50% - 6px);
  height: calc(100% - 12px);
  background: rgba(34, 139, 34, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(34, 139, 34, 0.5);
  border-radius: 8px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(34, 139, 34, 0.2);
  pointer-events: none;
  z-index: 0;
`;

// 토글 버튼 (기본)
export const toggleButtonStyle = css`
  position: relative;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(249, 249, 249, 0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.3s ease;
  z-index: 1;

  &:hover {
    color: rgba(249, 249, 249, 0.9);
  }

  &:active {
    transform: scale(0.98);
  }
`;

// 토글 버튼 (활성화)
export const activeToggleButtonStyle = css`
  color: ${colors.text.primary};
`;

// 모드 라벨
export const modeLabelStyle = css`
  display: block;
  position: relative;
  z-index: 2;
`;

// 툴팁 (기본 숨김)
export const tooltipStyle = css`
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 8px 12px;
  background: ${colors.background.dark.primary};
  backdrop-filter: blur(10px);
  border: 1px solid ${colors.border.strong};
  border-radius: 8px;
  color: ${colors.text.primary};
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 10;

  /* 툴팁 화살표 */
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${colors.background.dark.primary};
  }
`;

// 툴팁 (hover 시 보임)
export const tooltipVisibleStyle = css`
  opacity: 1;
  transform: translateX(-50%) translateY(0);
`;
