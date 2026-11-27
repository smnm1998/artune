import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { MEDIA } from '@/constants/breakpoints';

// 맨 위 로고 · 가운데 문구 · 맨 아래 입력창 — LLM 채팅 화면처럼 입력은 아래, 문구는 화면 정중앙
export const containerStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
`;

export const headerStyle = css`
  display: flex;
  align-items: center;
  padding: 20px 24px 12px;

  ${MEDIA.mobile} {
    justify-content: center;
    padding: 6px 16px 0;
  }
`;

export const heroStyle = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 24px 40px;
  text-align: center;

  ${MEDIA.mobile} {
    gap: 10px;
    padding: 0 24px 24px;
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

// 입력창 + 생성형 AI 고지 — 화면 맨 아래
export const composerAreaStyle = css`
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
