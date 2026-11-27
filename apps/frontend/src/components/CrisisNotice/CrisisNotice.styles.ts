import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const notice = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 500px;
  margin: 0 20px;
  padding: 16px 20px;
  border-radius: 16px;
  background: ${colors.glass.panel};
  backdrop-filter: ${colors.glass.blur};
  -webkit-backdrop-filter: ${colors.glass.blur};
  border: 1px solid ${colors.border.default};
  box-shadow: ${colors.shadow.panel};
  text-align: center;
`;

export const message = css`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: ${colors.text.primary};
`;

// 전화 걸기 — 누를 것이라 초록
export const call = css`
  align-self: center;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${colors.accent.base};
  color: ${colors.text.onAccent};
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    background: ${colors.accent.hover};
  }
`;
