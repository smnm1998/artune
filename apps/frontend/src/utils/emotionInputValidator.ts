/**
 * 감정 입력 검증 규칙
 */
export const VALIDATION_RULES = {
  MIN_LENGTH: 5,
  MAX_LENGTH: 500,
  ALLOWED_PATTERN: /^[\wㄱ-ㅎㅏ-ㅣ가-힣\s.,!?~\-'\"()]+$/,
};

/**
 * 감정 입력값 검증
 * @param {string} value - 검증할 텍스트
 * @returns {string|null} 에러 메시지 (유효하면 null)
 */
export const validateEmotionInput = (value: string): string | null => {
  const trimmed = value.trim();

  if (trimmed.length < VALIDATION_RULES.MIN_LENGTH) {
    return `최소 ${VALIDATION_RULES.MIN_LENGTH}자 이상 입력해주세요.`;
  }

  if (trimmed.length > VALIDATION_RULES.MAX_LENGTH) {
    return `최대 ${VALIDATION_RULES.MAX_LENGTH}자까지 입력 가능합니다.`;
  }

  if (!VALIDATION_RULES.ALLOWED_PATTERN.test(trimmed)) {
    return '특수문자는 .,!?~-\'\"() 만 사용 가능합니다.';
  }

  return null;
};

/**
 * 최대 길이 초과 여부 확인
 * @param {string} value - 확인할 텍스트
 * @returns {boolean}
 */
export const isMaxLengthExceeded = (value: string) => {
  return value.length > VALIDATION_RULES.MAX_LENGTH;
};
