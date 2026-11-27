import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { BREAKPOINTS } from '@/constants/breakpoints';

/** 입력창 placeholder 길이를 바꾸는 기준(useMediaQuery)과 같은 폭 — 이 아래는 모바일 입력창 */
const MOBILE = `@media (max-width: ${BREAKPOINTS.mobile}px)`;

/** 화면에서는 숨기고 화면 읽기 프로그램에는 읽힌다 */
const visuallyHidden = css`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

// 입력 칸 + 오류 문구
export const inputWrapperStyle = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

// 입력 카드 — 유리 한 겹, 보내기 버튼까지 카드 안에. 모바일은 테두리 대신 글자 수 테두리(ringStyle)가 둘레를 그린다
export const fieldStyle = css`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 12px 12px 20px;
  border-radius: 24px;
  background: ${colors.glass.panel};
  backdrop-filter: ${colors.glass.blur};
  -webkit-backdrop-filter: ${colors.glass.blur};
  border: 1px solid ${colors.border.subtle};
  box-shadow: ${colors.shadow.panel};
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: ${colors.border.focus};
  }

  &:focus-within [data-ring-track] {
    stroke: ${colors.border.focus};
  }

  ${MOBILE} {
    padding: 0;
    border: none;
    border-radius: 26px;
  }
`;

export const textareaStyle = css`
  display: block;
  width: 100%;
  min-height: 56px;
  max-height: 200px;
  margin: 0;
  padding: 0 8px 0 0;
  border: none;
  background: transparent;
  resize: none;
  font-size: 17px;
  line-height: 28px;
  color: ${colors.text.primary};
  caret-color: ${colors.accent.base};
  overflow-y: auto;
  /* 한국어는 단어 단위로 줄을 바꾼다(기본값은 글자 중간에서도 끊음). 띄어쓰기 없는 긴 글은 넘치지 않게 끊는다 */
  word-break: keep-all;
  overflow-wrap: anywhere;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${colors.text.placeholder};
  }

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.scrollbar.thumb};
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${colors.scrollbar.thumbHover};
  }

  ${MOBILE} {
    min-height: 52px;
    max-height: 160px;
    padding: 13px 60px 13px 18px;
    border-radius: 26px;
    /* iOS는 16px보다 작은 입력칸을 누르면 화면을 확대한다 */
    font-size: 16px;
    line-height: 26px;
  }
`;

// PC: 카드 아래 줄 [글자 수 ··· ⏎] / 모바일: ⏎만 칸 오른쪽 아래에 띄운다
export const fieldFooterStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  ${MOBILE} {
    position: absolute;
    right: 7px;
    bottom: 7px;
  }
`;

// 글자 수 — 모바일은 테두리로 보여 주고 숫자는 화면 읽기에만
export const counterStyle = css`
  font-size: 12px;
  line-height: 18px;
  color: ${colors.text.tertiary};
  font-variant-numeric: tabular-nums;

  ${MOBILE} {
    ${visuallyHidden};
  }
`;

// 모바일 글자 수 테두리 — 칸 둘레를 따라 왼쪽 위부터 시계방향으로 채운다 (선 굵기의 반은 칸 밖)
export const ringStyle = css`
  display: none;

  ${MOBILE} {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
`;

export const ringTrackStyle = css`
  fill: none;
  stroke: ${colors.border.default};
  stroke-width: 1.5;
  transition: stroke 0.15s ease;
`;

export const ringFillStyle = css`
  fill: none;
  stroke: ${colors.accent.base};
  stroke-width: 2;
  transition: stroke-dasharray 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// 보내기(⏎) — 누를 것이라 초록. 카드 안에 들어가는 작은 원
export const sendButtonStyle = css`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  margin-left: auto; /* 글자 수가 없어도 오른쪽 끝 */
  border: none;
  border-radius: 50%;
  background: ${colors.accent.base};
  color: ${colors.text.onAccent};
  font-size: 20px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;

  &:hover:not(:disabled) {
    background: ${colors.accent.hover};
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${colors.text.primary};
    outline-offset: 3px;
  }

  &:disabled {
    background: ${colors.fill.hover};
    color: ${colors.text.disabled};
    cursor: not-allowed;
  }
`;

export const errorMessageStyle = css`
  font-size: 0.875rem;
  color: ${colors.error};
  margin: 0;
  padding: 0 4px;
  animation: fadeIn 0.2s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
