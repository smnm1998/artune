import { useState } from 'react';
import { BrandHome, EmotionInput } from '@/components';
import {
  containerStyle,
  headerStyle,
  heroStyle,
  titleStyle,
  subTitleStyle,
  composerAreaStyle,
  footerStyle,
} from './EmotionInputPage.styles';
import useAppStore from '@/stores/useAppStore';
import { NOTICES } from '@/constants/notices';
import {
  validateEmotionInput,
  isMaxLengthExceeded,
  VALIDATION_RULES,
} from '@/utils/emotionInputValidator';

/**
 * 감정 입력 페이지 — 검증을 통과한 글로 스토어의 analyzeEmotion을 부른다.
 * 결과 전에 실패해 돌아오면 보낸 글(스토어 draft)로 다시 시작한다
 */
function EmotionInputPage() {
  const analyzeEmotion = useAppStore((state) => state.analyzeEmotion);
  const isLoading = useAppStore((state) => state.isLoading);
  const draft = useAppStore((state) => state.draft);
  const [text, setText] = useState(draft);
  const [error, setError] = useState('');

  const handleTextChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
    e,
  ) => {
    if (isLoading) return;
    const newValue = e.target.value;

    // 최대 길이 초과 방지
    if (isMaxLengthExceeded(newValue)) {
      setError(`최대 ${VALIDATION_RULES.MAX_LENGTH}자까지 입력 가능합니다.`);
      return;
    }
    setText(newValue);
    setError(''); // 입력 시 에러 초기화
  };

  const handleSubmit = () => {
    if (isLoading) return; // 보내는 중 (화면이 넘어가는 동안 다시 누름)

    const validationError = validateEmotionInput(text);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    // 실패는 스토어가 상태(error)로 바꿔 토스트로 띄운다 — 여기로 던지지 않는다
    void analyzeEmotion(text.trim());
  };

  return (
    <div css={containerStyle}>
      <header css={headerStyle}>
        {/* 이미 처음 화면 — 눌러도 그대로 */}
        <BrandHome />
      </header>

      <main css={heroStyle}>
        <h1 css={titleStyle}>오늘의 감정을 들려주세요</h1>
        <p css={subTitleStyle}>
          있었던 일을 편하게 적어 주시면, 지금 마음에 어울리는 노래를 골라
          드려요.
        </p>
      </main>

      <div css={composerAreaStyle}>
        <EmotionInput
          value={text}
          onChange={handleTextChange}
          onSubmit={handleSubmit}
          error={error}
          minLength={VALIDATION_RULES.MIN_LENGTH}
          maxLength={VALIDATION_RULES.MAX_LENGTH}
        />
        <footer css={footerStyle}>{NOTICES.AI_BEFORE_USE}</footer>
      </div>
    </div>
  );
}

export default EmotionInputPage;
