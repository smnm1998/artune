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
  backdrop-filter: blur(10px);
  background: ${colors.background.glass.light};
  border: 1px solid ${colors.accent.primary.border};
  text-align: center;
`;

export const message = css`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: ${colors.text.primary};
`;

export const call = css`
  align-self: center;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${colors.accent.primary.base};
  color: ${colors.text.primary};
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    background: ${colors.background.glass.mediumHeavy};
  }
`;
