import useMediaQuery from '@/hooks/ui/useMediaQuery';
import { QUERIES } from '@/constants/breakpoints';
import useAutoResizeTextarea from '@/hooks/ui/useAutoResizeTextarea';
import { IoReturnDownBack } from 'react-icons/io5';
import {
  inputWrapperStyle,
  fieldStyle,
  textareaStyle,
  fieldFooterStyle,
  counterStyle,
  ringStyle,
  ringTrackStyle,
  ringFillStyle,
  sendButtonStyle,
  errorMessageStyle,
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

const ERROR_ID = 'emotion-input-error';
const COUNT_ID = 'emotion-input-count';

/**
 * 감정 입력창 — PC는 카드 아래 줄에 [글자 수 ··· ⏎], 모바일은 칸 안에 ⏎ + 글자 수만큼 채워지는 테두리 (11/27 리디자인).
 * 칸 모양만 CSS로 바뀌고 요소는 하나라, 입력 중 화면 폭이 바뀌어도 글이 그대로다
 */
function EmotionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  error,
  minLength,
  maxLength,
}: EmotionInputProps) {
  const isMobile = useMediaQuery(QUERIES.mobile);

  // 반응형 placeholder
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return isMobile
      ? '오늘 어떤 일이 있었나요?'
      : '오늘 어떤 일이 있었나요? 자유롭게 적어 주세요';
  };

  const currentPlaceholder = getPlaceholder();
  const textareaRef = useAutoResizeTextarea(value, currentPlaceholder);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 조합 중 Enter는 마지막 글자를 확정하는 키 — 여기서 보내면 그 글자가 전송 뒤 빈 입력창에 남는다 (Safari는 keyCode 229로 온다)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // 모바일 테두리: pathLength 100 = 칸 둘레 한 바퀴 → 최대 글자 수일 때 다 채워진다
  const filled = maxLength
    ? Math.min(100, (value.length / maxLength) * 100)
    : 0;
  const describedBy =
    [error && ERROR_ID, maxLength && COUNT_ID].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div css={inputWrapperStyle}>
      <div css={fieldStyle}>
        <textarea
          id="emotion-input"
          name="emotion"
          aria-label="감정 입력"
          aria-invalid={!!error}
          aria-describedby={describedBy}
          minLength={minLength}
          ref={textareaRef}
          css={textareaStyle}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          rows={1}
        />

        {/* PC: 카드 아래 줄 [글자 수 ··· ⏎] / 모바일: ⏎만 칸 오른쪽 아래(글자 수는 테두리로) */}
        <div css={fieldFooterStyle}>
          {maxLength && (
            <span id={COUNT_ID} css={counterStyle}>
              {value.length} / {maxLength}자
            </span>
          )}
          <button
            type="button"
            css={sendButtonStyle}
            onClick={onSubmit}
            disabled={!value.trim()}
            aria-label="노래 추천받기"
          >
            <IoReturnDownBack aria-hidden="true" />
          </button>
        </div>

        {maxLength && (
          <svg css={ringStyle} aria-hidden="true">
            <rect
              data-ring-track=""
              css={ringTrackStyle}
              width="100%"
              height="100%"
              rx="26"
            />
            <rect
              css={ringFillStyle}
              width="100%"
              height="100%"
              rx="26"
              pathLength={100}
              strokeDasharray={`${filled} 100`}
            />
          </svg>
        )}
      </div>

      {error && (
        <p id={ERROR_ID} css={errorMessageStyle} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default EmotionInput;
