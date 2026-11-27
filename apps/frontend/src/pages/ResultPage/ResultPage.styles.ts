import { css, keyframes } from '@emotion/react';
import { colors } from '@/styles/theme';
import { BREAKPOINTS } from '@/constants/breakpoints';
import { MOBILE_BP } from '@/constants/size';

/** 좁은 화면 = 아트워크 뷰 ↔ 플레이리스트 뷰 (ResultPage의 isCompactView와 같은 기준) */
const COMPACT = `@media (max-width: ${BREAKPOINTS.compact}px)`;
const MOBILE = `@media (max-width: ${MOBILE_BP})`;

// 결과 화면의 스크롤 상자 — 아트워크 뷰 ↔ 플레이리스트 뷰를 바꿀 때 이 상자를 맨 위로 올린다. 왼쪽 패널 sticky의 기준도 이 상자
export const scrollAreaStyle = css`
  height: 100%;
  overflow: auto;
`;

// ARTUNE — 입력 화면 머리(EmotionInputPage headerStyle)와 같은 여백
export const headerStyle = css`
  display: flex;
  align-items: center;
  padding: 20px 24px 12px;
`;

// PC: 3:7 (왼쪽 감정 결과 · 오른쪽 추천곡) / 좁은 화면: 한 뷰씩 가운데
export const containerStyle = css`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 7fr);
  gap: 32px;
  align-items: start;
  max-width: 1440px;
  margin: 0 auto;
  padding: 8px 24px 32px;
  /* 가로 넘침은 잘라 내되 스크롤 상자는 만들지 않는다 — hidden이면 이 상자가 sticky 기준이 돼
     왼쪽 패널이 고정되지 않고 같이 올라갔다 (11/27 측정: 800px 내리면 패널도 -800) */
  overflow-x: clip;

  ${COMPACT} {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 20px;
    gap: 0;
  }
`;

// 왼쪽 패널 — 화면 높이를 채우고 스크롤해도 제자리 (안쪽 스크롤 상자 없음)
export const sidePanelStyle = css`
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  /* 머리(72) · 위아래 여백을 뺀 화면 높이. 내용이 더 길면(위기 안내 · 긴 공감 문구) 잘리지 않고 늘어난다 */
  height: calc(100vh - 104px);
  max-height: 800px;
  min-height: min-content;
  padding: 24px;
  border-radius: 28px;
  background: ${colors.glass.panel};
  backdrop-filter: ${colors.glass.blur};
  -webkit-backdrop-filter: ${colors.glass.blur};
  border: 1px solid ${colors.border.subtle};
  box-shadow: ${colors.shadow.panel};

  ${COMPACT} {
    position: static;
    width: 100%;
    max-width: 560px;
    height: auto;
    max-height: none;
    gap: 24px;
    padding: 32px;
  }

  ${MOBILE} {
    border-radius: 20px;
    padding: 24px 20px;
    gap: 80px;
  }
`;

// 패널 맨 아래 — [감상 안내 · 다시하기] (좁은 화면은 [다시하기 | 음악 보기])
export const sideFooterStyle = css`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;

  ${COMPACT} {
    margin-top: 32px;
  }
`;

export const sideGuideStyle = css`
  margin: 0;
  text-align: center;
  font-size: 12px;
  line-height: 18px;
  color: ${colors.text.tertiary};
  word-break: keep-all;
`;

// 오른쪽 — 머리 · 소개 카드 · 격자
export const trackSectionStyle = css`
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;

  ${COMPACT} {
    width: 100%;
    flex: 1;
    gap: 20px;
    padding-bottom: 20px;
  }
`;

// PC 머리 — 왼쪽 제목 묶음, 오른쪽 끝 토글 (좁아지면 토글이 아래 줄 오른쪽으로)
export const trackHeaderStyle = css`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;

  & > :last-child {
    flex: none;
    margin-left: auto;
  }
`;

export const headingStyle = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  ${COMPACT} {
    gap: 4px;
  }
`;

export const titleRowStyle = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;

  ${COMPACT} {
    justify-content: space-between;
    gap: 12px;
  }
`;

export const sectionTitleStyle = css`
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${colors.text.primary};

  ${COMPACT} {
    font-size: 18px;
    line-height: 26px;
  }
`;

// 곡을 다 받기 전 — 제목 옆 한 줄이라 끝나서 사라져도 아래가 움직이지 않는다
export const statusStyle = css`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 20px;
  color: ${colors.text.secondary};

  ${COMPACT} {
    gap: 6px;
    font-size: 13px;
    line-height: 18px;
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

export const liveDotStyle = css`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${colors.accent.base};
  animation: ${pulse} 1.6s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const countStyle = css`
  color: ${colors.text.primary};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

// 모드 설명 — 머리말 전에는 비어 있어도 한 줄 높이를 지켜 아래가 밀리지 않게
export const modeDescriptionStyle = css`
  margin: 0;
  min-height: 24px;
  font-size: 15px;
  line-height: 24px;
  color: ${colors.text.secondary};
  word-break: keep-all;

  ${COMPACT} {
    min-height: 22px;
    font-size: 14px;
    line-height: 22px;
  }
`;

/* --- 좁은 화면 머리 (뒤로 + 토글) --- */

export const mobileMusicHeaderStyle = css`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  height: 56px; /* 버튼 높이 고정 */
  flex-shrink: 0;
`;

export const toggleWrapperStyle = css`
  flex: 1;
  height: 100%;
  display: flex;
  justify-content: center;

  /* 토글을 머리 높이에 맞춘다 — 두 칸은 grid라 높이를 따라 늘어난다 */
  & > div {
    height: 100%;
    max-width: 400px;
  }
`;

export const backButtonStyle = css`
  width: 54px;
  height: 54px;
  border-radius: 50px;
  background: ${colors.glass.panel};
  backdrop-filter: ${colors.glass.blur};
  -webkit-backdrop-filter: ${colors.glass.blur};
  border: 1px solid ${colors.border.subtle};
  box-shadow: ${colors.shadow.raised};
  color: ${colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &:active {
    background: ${colors.background.surface};
    transform: scale(0.96);
  }
`;

export const playlistStyle = css`
  width: 100%;
  flex: 1;
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

// 맨 아래 고지 — 결과 영역 다음, 스크롤 끝에 온다
export const footerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 24px;
  text-align: center;
  font-size: 12px;
  line-height: 18px;
  color: ${colors.text.tertiary};

  p {
    margin: 0;
  }

  ${COMPACT} {
    padding: 0 20px 24px;
  }
`;
