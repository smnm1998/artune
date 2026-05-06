import { useHover } from '@/hooks';
import {
  toggleContainerStyle,
  toggleWrapperStyle,
  toggleButtonStyle,
  activeToggleButtonStyle,
  sliderStyle,
  modeLabelStyle,
  tooltipStyle,
  tooltipVisibleStyle,
} from './PlaylistToggle.styles';

type Mode = 'immerse' | 'soothe';

interface PlaylistToggleProps {
  selectedMode: Mode;
  onModeChange: (mode: Mode) => void;
  immerseLabel?: string;
  sootheLabel?: string;
  immerseDescription?: string;
  sootheDescription?: string;
}

function PlaylistToggle({
  selectedMode,
  onModeChange,
  immerseLabel,
  sootheLabel,
  immerseDescription,
  sootheDescription,
}: PlaylistToggleProps) {
  const { handleMouseEnter, handleMouseLeave, isHovered } = useHover<Mode>();

  return (
    <div css={toggleContainerStyle}>
      <div css={toggleWrapperStyle}>
        {/* 슬라이딩 인디케이터 */}
        <div
          css={sliderStyle}
          style={{
            transform:
              selectedMode === 'immerse'
                ? 'translateX(0%)'
                : 'translateX(100%)',
          }}
        />

        {/* 감정 심취 버튼 */}
        <button
          css={[
            toggleButtonStyle,
            selectedMode === 'immerse' && activeToggleButtonStyle,
          ]}
          onClick={() => onModeChange('immerse')}
          onMouseEnter={() => handleMouseEnter('immerse')}
          onMouseLeave={handleMouseLeave}
        >
          <span css={modeLabelStyle}>{immerseLabel || '감정 심취'}</span>

          {/* Hover 툴팁 */}
          {immerseDescription && (
            <div
              css={[tooltipStyle, isHovered('immerse') && tooltipVisibleStyle]}
            >
              {immerseDescription}
            </div>
          )}
        </button>

        {/* 감정 완화 버튼 */}
        <button
          css={[
            toggleButtonStyle,
            selectedMode === 'soothe' && activeToggleButtonStyle,
          ]}
          onClick={() => onModeChange('soothe')}
          onMouseEnter={() => handleMouseEnter('soothe')}
          onMouseLeave={handleMouseLeave}
        >
          <span css={modeLabelStyle}>{sootheLabel || '감정 완화'}</span>

          {/* Hover 툴팁 */}
          {sootheDescription && (
            <div
              css={[tooltipStyle, isHovered('soothe') && tooltipVisibleStyle]}
            >
              {sootheDescription}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export default PlaylistToggle;
