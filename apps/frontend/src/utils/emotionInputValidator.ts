/**
 * 감정 입력 검증 — 길이만 본다. 문자 종류는 막지 않는다(^^ · :) · … · 이모지도 감정 표현이다).
 * 보이지 않는 제어 문자만 거부한다 (줄바꿈·탭은 허용)
 */
export const VALIDATION_RULES = {
  MIN_LENGTH: 5,
  MAX_LENGTH: 500,
};

/** 제어 문자(C0·DEL·C1) 중 줄바꿈·탭이 아닌 것 */
const CONTROL_CHAR = /(?![\t\n\r])\p{Cc}/u;

/** @returns 안내 문구 (통과하면 null) */
export const validateEmotionInput = (value: string): string | null => {
  const trimmed = value.trim();

  if (trimmed.length < VALIDATION_RULES.MIN_LENGTH) {
    return `최소 ${VALIDATION_RULES.MIN_LENGTH}자 이상 입력해주세요.`;
  }

  if (trimmed.length > VALIDATION_RULES.MAX_LENGTH) {
    return `최대 ${VALIDATION_RULES.MAX_LENGTH}자까지 입력 가능합니다.`;
  }

  if (CONTROL_CHAR.test(trimmed)) {
    return '보이지 않는 제어 문자가 섞여 있어요. 지우고 다시 입력해주세요.';
  }

  return null;
};

export const isMaxLengthExceeded = (value: string) =>
  value.length > VALIDATION_RULES.MAX_LENGTH;
