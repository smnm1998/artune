import { IoRefresh, IoMusicalNotes } from 'react-icons/io5';
import {
  containerStyle,
  buttonStyle,
  primaryButtonStyle,
  iconWrapperStyle,
  buttonTextStyle,
} from './ActionButtons.styles';
import useConfirmRestart from '@/hooks/ui/useConfirmRestart';

interface ActionButtonsProps {
  onNext?: () => void;
}

/**
 * 결과 페이지 하단 버튼 — 다시하기(항상) · 음악 보기(onNext를 줄 때만: 좁은 화면에서 플레이리스트 뷰로)
 */
function ActionButtons({ onNext }: ActionButtonsProps) {
  const handleRestart = useConfirmRestart();

  return (
    <div css={containerStyle}>
      {/* 다시하기 (항상 표시) */}
      <button type="button" css={buttonStyle} onClick={handleRestart}>
        <div css={iconWrapperStyle}>
          <IoRefresh size={18} />
        </div>
        <span css={buttonTextStyle}>다시하기</span>
      </button>

      {/* 추천 음악 보러가기 (모바일/태블릿 전용) */}
      {onNext && (
        <button
          type="button"
          css={[buttonStyle, primaryButtonStyle]}
          onClick={onNext}
        >
          <div css={iconWrapperStyle}>
            <IoMusicalNotes size={20} />
          </div>
          <span css={buttonTextStyle}>음악 보기</span>
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
