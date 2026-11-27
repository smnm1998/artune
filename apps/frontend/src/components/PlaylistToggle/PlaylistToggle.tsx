import {
  toggleWrapperStyle,
  toggleButtonStyle,
  activeToggleButtonStyle,
  sliderStyle,
  modeLabelStyle,
  type ToggleSize,
} from './PlaylistToggle.styles';

type Mode = 'immerse' | 'soothe';

interface PlaylistToggleProps {
  selectedMode: Mode;
  onModeChange: (mode: Mode) => void;
  immerseLabel?: string;
  sootheLabel?: string;
  /** small: PC 추천곡 머리 오른쪽 끝(높이 32) / large: 좁은 화면 머리 (11/27 — 모드 설명은 툴팁 대신 제목 아래 문장으로) */
  size?: ToggleSize;
}

function PlaylistToggle({
  selectedMode,
  onModeChange,
  immerseLabel,
  sootheLabel,
  size = 'large',
}: PlaylistToggleProps) {
  const modes: { id: Mode; label: string }[] = [
    { id: 'immerse', label: immerseLabel || '감정 심취' },
    { id: 'soothe', label: sootheLabel || '감정 완화' },
  ];

  return (
    <div css={toggleWrapperStyle(size)}>
      {/* 고른 칸 뒤로 흰 면이 미끄러진다 */}
      <div
        css={sliderStyle(size)}
        style={{
          transform:
            selectedMode === 'immerse' ? 'translateX(0%)' : 'translateX(100%)',
        }}
      />

      {modes.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          css={[
            toggleButtonStyle(size),
            selectedMode === id && activeToggleButtonStyle,
          ]}
          aria-pressed={selectedMode === id}
          onClick={() => onModeChange(id)}
        >
          <span css={modeLabelStyle}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export default PlaylistToggle;
