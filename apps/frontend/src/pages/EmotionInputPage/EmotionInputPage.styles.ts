import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { MEDIA } from '@/constants/breakpoints';

// 맨 위 로고 · 가운데 문구 · 맨 아래 입력창 — LLM 채팅 화면처럼 입력은 아래, 문구는 화면 정중앙.
// 위아래 칸(1fr)을 같은 크기로 나눠 문구가 머리·입력창 높이와 상관없이 화면 가운데에 온다
// (전에는 머리와 입력창 사이의 가운데라 입력창이 머리보다 큰 만큼 위로 — 11/27 측정 PC −79 · 모바일 −38px).
// 입력창이 길어져 아래 칸이 모자라면 그 칸만 커지고 문구가 위로 비켜 겹치지 않는다
export const containerStyle = css`
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  height: 100%;
  overflow-y: auto;
`;

export const headerStyle = css`
  align-self: start;
  display: flex;
  align-items: center;
  padding: 20px 24px 12px;

  ${MEDIA.mobile} {
    justify-content: center;
    padding: 6px 16px 0;
  }
`;

export const heroStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  /* 위아래 같은 여백 — 가운데는 그대로, 낮은 화면(가로 폰 844x390)에서 입력 카드에 붙지 않게 */
  padding: 24px;
  text-align: center;

  ${MEDIA.mobile} {
    gap: 10px;
  }
`;

export const titleStyle = css`
  margin: 0;
  font-size: 40px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${colors.text.primary};
  word-break: keep-all;

  ${MEDIA.mobile} {
    font-size: 26px;
  }
`;

export const subTitleStyle = css`
  margin: 0;
  font-size: 17px;
  line-height: 1.65;
  color: ${colors.text.secondary};
  word-break: keep-all;

  ${MEDIA.mobile} {
    font-size: 15px;
  }
`;

// 입력창 + 생성형 AI 고지 — 화면 맨 아래 (길어지면 위로 자란다)
export const composerAreaStyle = css`
  align-self: end;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px 24px;

  ${MEDIA.mobile} {
    gap: 10px;
    padding: 0 16px 16px;
  }
`;

export const footerStyle = css`
  margin: 0;
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
  color: ${colors.text.tertiary};
`;
