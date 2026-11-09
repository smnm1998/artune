import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

// 배지 → 그 아래 출처 표기
export const wrapperStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

export const badgeLinkStyle = css`
  display: inline-block;
  line-height: 0;
`;

// Apple Music 가이드라인: 화면에서 배지 높이 30px 이상(최소로 작게), 둘레 여백은 높이의 1/10 이상(그 안에 다른 요소 금지)
export const badgeImageStyle = css`
  display: block;
  height: 30px;
  width: auto;
  /* 여백은 margin으로 — 전역 box-sizing: border-box라 padding이면 그림이 24px로 줄어 최소 30px에 못 미친다 */
  margin: 3px; /* 배지 높이 30px의 1/10 */
`;

// 문구는 약관에 지정된 표현이라 줄이지 않고 글자만 작게
export const attributionStyle = css`
  margin: 0;
  font-size: 10px;
  color: ${colors.text.tertiary};
`;
