import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const loadingContainerStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${colors.background.gradient};
  padding: 40px 20px;
  overflow: hidden;
`;

// 아이콘 래퍼 (좌우 이동 담당)
export const iconWrapperStyle = css`
  margin-bottom: 48px;
`;

// 아이콘 스타일 (비행 담당)
export const iconStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 프로그래스 바 + 텍스트를 감싸는 래퍼
export const progressWrapperStyle = css`
  width: 100%;
  max-width: 280px;
`;

// 진행 퍼센트
export const progressPercentageStyle = css`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.text.primary};
  text-align: center;
  margin-bottom: 16px;
`;

// 프로그래스 바 배경
export const progressBarContainerStyle = css`
  width: 100%;
  height: 8px;
  background-color: rgba(249, 249, 249, 0.1);
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 16px;
`;

// 프로그래스 바 (채우는 부분)
export const progressBarFillStyle = css`
  height: 100%;
  background: linear-gradient(90deg, #f9f9f9 0%, #a0a0a0 100%);
  border-radius: 9999px; /* ← 추가 */
  box-shadow: 0 0 10px rgba(249, 249, 249, 0.5);
`;

// 텍스트
export const loadingTextStyle = css`
  font-size: 14px;
  font-weight: 500;
  color: rgba(249, 249, 249, 0.8);
  text-align: center;
  letter-spacing: 0.5px;
`;
