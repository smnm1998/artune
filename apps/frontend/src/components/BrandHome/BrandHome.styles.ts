import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { BREAKPOINTS } from '@/constants/breakpoints';

// 굵은 대문자 + 살짝 넓힌 자간 — 링크지만 밑줄·색 없이 로고처럼
export const brandStyle = css`
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: ${colors.text.primary};
  text-decoration: none;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid ${colors.text.primary};
    outline-offset: 2px;
  }

  /* 모바일: 누르기 쉬운 높이(44px) */
  @media (max-width: ${BREAKPOINTS.mobile}px) {
    height: 44px;
    padding: 0 8px;
    font-size: 17px;
  }
`;
