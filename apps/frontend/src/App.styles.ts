import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

// 앱 틀 = 보이는 화면 높이. 모바일 Safari의 100vh는 주소창이 접힌 높이라 화면보다 커져 아래가 잘리고
// 바깥이 한 번 더 스크롤됐다 → 보이는 높이(dvh)로, 못 알아듣는 브라우저는 100vh. 폭은 100%(100vw는 스크롤 막대만큼 넘친다)
export const appStyle = css`
  width: 100%;
  height: 100vh;
  height: 100dvh;
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
