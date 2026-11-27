import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { BREAKPOINTS } from '@/constants/breakpoints';

const COMPACT = `@media (max-width: ${BREAKPOINTS.compact}px)`;

// 소개 카드 → 격자
export const listStyle = css`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
`;

/** PC(소개 카드 아래): 3열 — 1440 폭에서 칸 약 300px / 좁은 화면: 2열 (목업 간격 14 · 22) */
export const gridContainerStyle = (featureFirst: boolean) => css`
  display: grid;
  grid-template-columns: repeat(${featureFirst ? 3 : 2}, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 28px;
  width: 100%;

  ${COMPACT} {
    column-gap: 14px;
    row-gap: 22px;
  }
`;

// 받은 곡 칸 (커버 + 곡명 · 가수) — 길게 누르기 메뉴(모바일)와 글자 선택을 막는다
export const gridItemStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  ${COMPACT} {
    gap: 10px;
  }
`;

export const trackMetaStyle = css`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 0 2px;

  p {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const trackTitleStyle = css`
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  color: ${colors.text.primary};
`;

export const trackArtistStyle = css`
  font-size: 13px;
  line-height: 20px;
  color: ${colors.text.secondary};
`;
