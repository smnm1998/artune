import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const appStyle = css`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: ${colors.background.gradient};
`;

// 입력·결과 화면이 같은 자리에서 페이드로 바뀐다
export const pageStyle = css`
  position: absolute;
  width: 100%;
  height: 100%;
`;

export const scrollPageStyle = css`
  overflow: auto;
`;
