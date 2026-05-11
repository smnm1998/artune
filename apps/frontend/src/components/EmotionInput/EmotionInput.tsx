import useMediaQuery from '@/hooks/ui/useMediaQuery';
import { BREAKPOINTS } from '@/constants/breakpoints';
import useAutoResizeTextarea from '@/hooks/ui/useAutoResizeTextarea';
import { IoSend } from 'react-icons/io5';
import {
  textareaContainerStyle,
  textareaStyle,
  sendButtonStyle,
  sendButtonIconStyle,
  errorMessageStyle,
  inputWrapperStyle,
} from './EmotionInput.styles';

interface EmotionInputProps {
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit: () => void;
  placeholder?: string;
  error?: string;
  minLength?: number;
  maxLength?: number;
}

function EmotionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  error,
  minLength,
  maxLength,
}: EmotionInputProps) {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.mobile}px)`);

  // 반응형 placeholder
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return isMobile
      ? '오늘 어떤 일이 있었나요?'
      : '오늘 어떤 일이 있었나요? 자유롭게 적어주세요...';
  };

  const currentPlaceholder = getPlaceholder();
  const textareaRef = useAutoResizeTextarea(value, currentPlaceholder);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div css={inputWrapperStyle}>
      <div css={textareaContainerStyle}>
        <textarea
          id="emotion-input"
          name="emotion"
          aria-label="감정 입력"
          aria-invalid={!!error}
          aria-describedby={error ? 'emotion-input-error' : undefined}
          minLength={minLength}
          ref={textareaRef}
          css={textareaStyle}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          rows={1}
        />

        {/* Send Button */}
        <button
          css={sendButtonStyle}
          onClick={onSubmit}
          disabled={!value.trim()}
          aria-label="전송"
        >
          <IoSend css={sendButtonIconStyle} />
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p id="emotion-input-error" css={errorMessageStyle} role="alert">
          {error}
        </p>
      )}

      {/* 글자 수 표시 */}
      {maxLength && (
        <p css={errorMessageStyle} style={{ color: 'rgba(255,255,255,0.5)' }}>
          {value.length} / {maxLength}자
        </p>
      )}
    </div>
  );
}

export default EmotionInput;
