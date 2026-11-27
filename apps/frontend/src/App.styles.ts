import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

export const appStyle = css`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: ${colors.background.page};
`;

// 입력·결과 화면이 같은 자리에서 페이드로 바뀐다 — 스크롤은 각 화면이 맡는다 (결과 화면: ResultPage의 scrollAreaStyle)
export const pageStyle = css`
  position: absolute;
  width: 100%;
  height: 100%;
`;
