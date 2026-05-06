import { IoRefresh, IoMusicalNotes } from 'react-icons/io5';
import {
  containerStyle,
  buttonStyle,
  primaryButtonStyle,
  iconWrapperStyle,
  buttonTextStyle,
} from './ActionButtons.styles';
import useAppStore from '@/stores/useAppStore';

interface ActionButtonsProps {
  onNext?: () => void;
}

/**
 * 결과 페이지 하단 액션 버튼 그룹
 * * @param {Object} props
 * @param {Function} [props.onNext] - '음악 보기' 버튼 핸들러 (없으면 렌더링 안함)
 */
function ActionButtons({ onNext }: ActionButtonsProps) {
  const reset = useAppStore((state) => state.reset);

  const handleRestart = () => {
    if (window.confirm('처음부터 다시 시작하시겠습니까?')) {
      reset();
    }
  };

  return (
    <div css={containerStyle}>
      {/* 다시하기 (항상 표시) */}
      <button css={buttonStyle} onClick={handleRestart}>
        <div css={iconWrapperStyle}>
          <IoRefresh size={20} />
        </div>
        <span css={buttonTextStyle}>다시하기</span>
      </button>

      {/* 추천 음악 보러가기 (모바일/태블릿 전용) */}
      {onNext && (
        <button css={[buttonStyle, primaryButtonStyle]} onClick={onNext}>
          <div css={iconWrapperStyle}>
            <IoMusicalNotes size={20} color="#ffffff" />
          </div>
          <span css={buttonTextStyle}>음악 보기</span>
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
