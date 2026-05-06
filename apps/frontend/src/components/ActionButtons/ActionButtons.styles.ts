import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const containerStyle = css`
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  width: 100%;
`;

// 기본 버튼
export const buttonStyle = css`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: ${colors.background.glass.light};
  border: 1px solid ${colors.border.strong};
  border-radius: 12px;
  color: ${colors.text.primary};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${colors.background.glass.medium};
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.98);
  }
`;

// 강조 버튼 (음악 보기)
export const primaryButtonStyle = css`
  background: ${colors.accent.primary.base};
  border-color: ${colors.accent.primary.border};
  box-shadow: 0 4px 12px ${colors.shadow.colored};

  &:hover {
    background: ${colors.accent.primary.border};
  }
`;

export const iconWrapperStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.text.primary};
`;

export const buttonTextStyle = css`
  line-height: 1;
`;
