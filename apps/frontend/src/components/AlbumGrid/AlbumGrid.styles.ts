import { css } from '@emotion/react';
import { LAPTOP_BP, TABLET_BP, MOBILE_BP } from '@/constants/size';

export const gridContainerStyle = css`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: auto;
  gap: 70px;
  width: 100%;
  max-width: 800px;
  box-sizing: border-box; /* 패딩 포함 계산 */

  > * {
    position: relative;
    aspect-ratio: 1;
    width: 100%;
  }

  /* [Laptop] 간격 축소 */
  @media (max-width: ${LAPTOP_BP}) {
    gap: 40px;
  }

  /* [Tablet] 꽉 찬 너비 */
  @media (max-width: ${TABLET_BP}) {
    gap: 30px;
    max-width: 100%;
  }

  /* [Mobile] 2열 유지하되 간격 최소화 */
  @media (max-width: ${MOBILE_BP}) {
    gap: 16px;
    padding: 0 4px;
  }
`;
