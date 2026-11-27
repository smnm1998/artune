import { css } from '@emotion/react';
import { colors } from '@/styles/theme';
import { TABLET_BP, MOBILE_BP } from '@/constants/size';

export const textareaContainerStyle = css`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 12px;
`;

export const textareaStyle = css`
  background: none;
  border: none;
  flex: 1;
  min-height: 57px;
  max-height: 200px;
  padding: 16px;
  font-size: 20px;
  color: ${colors.text.primary};
  border-radius: 12px;
  resize: none;
  transition: all 0.3s ease;
  overflow-y: auto;
  caret-color: ${colors.accent.base};

  &:focus {
    outline: none;
    background: none;
    border: none;
  }

  &:hover {
    background: none;
    border: none;
  }

  &::placeholder {
    color: ${colors.text.placeholder};
  }

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
    margin: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.scrollbar.thumb};
    border-radius: 10px;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${colors.scrollbar.thumbHover};
  }

  @media (max-width: ${TABLET_BP}) {
    font-size: 18px;
  }
`;

export const sendButtonStyle = css`
  width: 57px;
  height: 57px;
  min-width: 57px;
  border-radius: 50px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  font-size: 24px;
  color: ${colors.text.onAccent};
  background: ${colors.accent.base};
  box-shadow: ${colors.shadow.accent};
  border: none;

  &:hover:not(:disabled) {
    background: ${colors.accent.hover};
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    background: ${colors.fill.hover};
    box-shadow: none;
    color: ${colors.text.disabled};
    cursor: not-allowed;
    transform: none;
  }
`;

export const sendButtonIconStyle = css`
  @media (max-width: ${MOBILE_BP}) {
    font-size: 16px;
  }
`;

export const inputWrapperStyle = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

// 글자 수 — 오류 문구와 같은 자리·크기, 색만 흐리게
export const counterStyle = css`
  font-size: 0.875rem;
  color: ${colors.text.tertiary};
  margin: 0;
  padding: 0 4px;
  font-variant-numeric: tabular-nums;
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
