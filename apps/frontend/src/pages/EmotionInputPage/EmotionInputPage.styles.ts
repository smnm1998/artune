import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { MOBILE_BP } from '@/constants/size';

export const containerStyle = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  gap: 24px;
  background: ${colors.background.gradient};
`;

export const titleWrapperStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
`;

export const titleStyle = css`
  font-size: 50px;
  font-weight: 700;
  margin: 0;
  color: ${colors.text.primary};

  @media (max-width: ${MOBILE_BP}) {
    font-size: 32px;
  }
`;

export const subTitleStyle = css`
  font-size: 26px;
  font-weight: 700;
  color: ${colors.text.primary};
  opacity: 0.6;

  @media (max-width: ${MOBILE_BP}) {
    font-size: 18px;
  }
`;

export const inputWrapperStyle = css`
  position: relative;
  width: 100%;
  max-width: 1000px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${colors.background.glass.light};
  border-radius: 16px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid ${colors.border.medium};
`;
