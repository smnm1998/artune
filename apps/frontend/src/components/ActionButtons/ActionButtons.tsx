import { IoRefresh, IoArrowForward } from 'react-icons/io5';
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
 * 결과 페이지 하단 버튼 — 다시하기(항상) · 추천곡 보기(onNext를 줄 때만: 좁은 화면에서 추천곡 뷰로, 폭 2배)
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

      {/* 추천곡 보러 가기 (좁은 화면 전용) — 화살표는 글자 뒤 (목업) */}
      {onNext && (
        <button
          type="button"
          css={[buttonStyle, primaryButtonStyle]}
          onClick={onNext}
        >
          <span css={buttonTextStyle}>추천곡 보기</span>
          <div css={iconWrapperStyle}>
            <IoArrowForward size={18} />
          </div>
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
