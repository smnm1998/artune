import { css } from '@emotion/react';
import { colors } from '@/styles/theme';

// 유리 카드 — 왼쪽 커버 240 · 오른쪽 곡 정보와 안내
export const cardStyle = css`
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 20px;
  border-radius: 24px;
  background: ${colors.glass.panel};
  backdrop-filter: ${colors.glass.blur};
  -webkit-backdrop-filter: ${colors.glass.blur};
  border: 1px solid ${colors.border.subtle};
  box-shadow: ${colors.shadow.panel};
`;

export const coverStyle = css`
  flex: none;
  width: 240px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
`;

export const infoStyle = css`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  word-break: keep-all;
`;

export const eyebrowStyle = css`
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  color: ${colors.text.tertiary};
`;

// 곡명 — 길면 두 줄까지
export const titleStyle = css`
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${colors.text.primary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
`;

// 가수 · 앨범
export const subtitleStyle = css`
  margin: 0;
  font-size: 15px;
  line-height: 22px;
  color: ${colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const skeletonLinesStyle = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
`;

// 듣는 법 안내 상자
export const guideStyle = css`
  margin: 14px 0 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${colors.fill.subtle};
  font-size: 14px;
  line-height: 22px;
  color: ${colors.text.secondary};
`;

export const guideIconStyle = css`
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 2px;
`;
