import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { LAPTOP_BP, TABLET_BP, MOBILE_BP } from '@/constants/size';

// 전체 컨테이너
export const containerStyle = css`
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 1600px;
  margin: 0 auto;
  background: transparent;
  padding: 40px;
  gap: 80px;
  align-items: flex-start;

  /* 가로 스크롤 방지 */
  overflow-x: hidden;
  box-sizing: border-box;

  @media (max-width: ${LAPTOP_BP}) {
    padding: 32px;
    gap: 40px;
  }

  /* [Tablet & Mobile] Single View 모드 + 중앙 정렬 */
  @media (max-width: ${TABLET_BP}) {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    gap: 0;
  }
`;

// 왼쪽 섹션 (아트워크 + 액션버튼)
export const leftSectionStyle = css`
  flex: 0 0 480px; /* PC 고정 너비 */
  display: flex;
  flex-direction: column;
  gap: 24px;

  background: ${colors.background.glass.subtle};
  backdrop-filter: blur(20px);
  border: 1px solid ${colors.border.light};
  border-radius: 24px;
  padding: 32px;

  box-shadow:
    0 8px 32px ${colors.shadow.light},
    inset 0 1px 0 ${colors.shadow.inset};

  /* PC: 스크롤 시 상단 고정 */
  position: sticky;
  top: 40px;
  height: fit-content;
  overflow-y: auto;

  /* [Laptop] 너비 축소 */
  @media (max-width: ${LAPTOP_BP}) and (max-height: 800px) {
    position: relative;
    top: 0;
    gap: 16px;
  }

  /* [Tablet] 고정 해제 및 중앙 배치 */
  @media (max-width: ${TABLET_BP}) {
    flex: none;
    position: relative;
    top: 0;
    width: 100%;
    align-items: center;
    max-width: 700px; /* 태블릿 적정 너비 제한 */
    height: auto;
  }

  /* [Mobile] 꽉 찬 너비 */
  @media (max-width: ${MOBILE_BP}) {
    max-width: 100%;
    border-radius: 20px;
    padding: 24px 20px;
    gap: 80px;
  }
`;

// 버튼 래퍼 (아트워크 하단 버튼 그룹)
export const actionButtonWrapperStyle = css`
  margin-top: 24px; /* 기본 간격 */

  /* [Tablet & Mobile] 하단 고정 해제, 자연스러운 간격 유지 */
  @media (max-width: ${TABLET_BP}) {
    margin-top: 32px;
  }
`;

// 오른쪽 섹션 (플레이리스트)
export const rightSectionStyle = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
  align-items: center;
  width: 100%;
  max-width: 900px;

  /* PC: 전체 높이 확보 */
  min-height: calc(100vh - 80px);
  padding-bottom: 60px;

  /* [Laptop] */
  @media (max-width: ${LAPTOP_BP}) {
    gap: 32px;
  }

  /* [Tablet & Mobile] */
  @media (max-width: ${TABLET_BP}) {
    width: 100%;
    min-height: auto; /* 뷰포트 중앙 정렬을 위해 해제 */
    gap: 20px;
    padding-bottom: 20px;
    flex: 1; /* 내용이 많으면 늘어나도록 */
  }
`;

/* --- 헤더 UI (토글 + 뒤로가기) --- */

export const mobileMusicHeaderStyle = css`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  height: 56px; /* 버튼 높이 고정 */
  margin-bottom: 12px;
  flex-shrink: 0;
`;

export const toggleWrapperStyle = css`
  flex: 1;
  height: 100%;
  display: flex;
  justify-content: center;

  /* 내부 컴포넌트 크기 강제 */
  & > div {
    height: 100%;
    margin: 0;
    width: 100%;
    max-width: 400px;
  }
  & > div > div {
    height: 100%;
  }
`;

export const backButtonStyle = css`
  width: 54px;
  height: 54px;
  border-radius: 50px;
  background: ${colors.background.glass.light};
  border: 1px solid ${colors.border.light};
  color: ${colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &:active {
    background: ${colors.background.glass.medium};
    transform: scale(0.96);
  }
`;

export const emptyStateStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 2rem;
  text-align: center;
  color: ${colors.text.secondary};

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: ${colors.text.primary};
  }

  p {
    font-size: 1rem;
    line-height: 1.6;
    max-width: 400px;
  }
`;
