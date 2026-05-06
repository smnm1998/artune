import { useState } from 'react';
import { EmotionInput } from '@/components';
import {
  containerStyle,
  titleWrapperStyle,
  titleStyle,
  subTitleStyle,
  inputWrapperStyle,
} from './EmotionInputPage.styles';
import useAppStore from '@/stores/useAppStore';
import {
  validateEmotionInput,
  isMaxLengthExceeded,
  VALIDATION_RULES,
} from '@/utils/emotionInputValidator';

/**
 * 감정 입력 페이지
 * 사용자로부터 감정 텍스트를 입력받아 Zustand store의 analyzeEmotion을 호출
 */
function EmotionInputPage() {
  const analyzeEmotion = useAppStore((state) => state.analyzeEmotion);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTextChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
    e,
  ) => {
    if (isSubmitting) return;
    const newValue = e.target.value;

    // 최대 길이 초과 방지
    if (isMaxLengthExceeded(newValue)) {
      setError(`최대 ${VALIDATION_RULES.MAX_LENGTH}자까지 입력 가능합니다.`);
      return;
    }
    setText(newValue);
    setError(''); // 입력 시 에러 초기화
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // 검증
    const validationError = validateEmotionInput(text);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');
    const textToSubmit = text.trim();
    setText('');

    try {
      // Store에서 직접 호출
      await analyzeEmotion(textToSubmit);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '감정 분석 중 오류가 발생했습니다. 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div css={containerStyle}>
      <div css={titleWrapperStyle}>
        <h1 css={titleStyle}>안녕하세요!</h1>
        <p css={subTitleStyle}>오늘의 감정을 들려주세요.</p>
      </div>

      <div css={inputWrapperStyle}>
        <EmotionInput
          value={text}
          onChange={handleTextChange}
          onSubmit={handleSubmit}
          error={error}
          minLength={VALIDATION_RULES.MIN_LENGTH}
          maxLength={VALIDATION_RULES.MAX_LENGTH}
        />
      </div>
    </div>
  );
}

export default EmotionInputPage;
