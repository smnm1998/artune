import { describe, it, expect } from 'vitest';
import {
  validateEmotionInput,
  VALIDATION_RULES,
} from '@/utils/emotionInputValidator';

describe('validateEmotionInput', () => {
  it.each([
    '오늘 너무 힘들었어 ㅠㅠ',
    '기분 좋아요 ^^',
    '시험 끝! :)',
    '하… 피곤하다',
    '최고의 하루 😆',
    '100% 행복해',
    '비/눈 오는 날',
    '첫 줄\n둘째 줄\t탭',
  ])('감정 표현에 쓰는 문자는 통과한다: %s', (text) => {
    expect(validateEmotionInput(text)).toBeNull();
  });

  it('보이지 않는 제어 문자가 섞이면 거부한다', () => {
    expect(validateEmotionInput('오늘은\u0007 좋은 날')).toContain('제어 문자');
  });

  it(`앞뒤 공백을 빼고 ${VALIDATION_RULES.MIN_LENGTH}자 미만이면 거부한다`, () => {
    expect(validateEmotionInput('   좋아   ')).toContain('최소');
  });

  it(`${VALIDATION_RULES.MAX_LENGTH}자를 넘으면 거부한다`, () => {
    expect(
      validateEmotionInput('가'.repeat(VALIDATION_RULES.MAX_LENGTH + 1)),
    ).toContain('최대');
  });
});
