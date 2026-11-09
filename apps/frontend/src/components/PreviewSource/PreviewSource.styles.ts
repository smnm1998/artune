import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const wrapperStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const attributionStyle = css`
  margin: 0;
  font-size: 11px;
  color: ${colors.text.tertiary};
`;

// Apple Music 가이드라인: 화면에서 배지 높이 30px 이상, 둘레 여백은 배지 높이의 1/10 이상(그 안에 다른 요소 금지)
export const badgeLinkStyle = css`
  display: inline-block;
  padding: 4px; /* 배지 높이 40px의 1/10 */
  line-height: 0;
`;

export const badgeImageStyle = css`
  display: block;
  height: 40px;
  width: auto;
`;
