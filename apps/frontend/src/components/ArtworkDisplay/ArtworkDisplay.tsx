import * as styles from './ArtworkDisplay.styles';

/** 감상 안내 — 좁은 화면은 공감 문구 아래, PC는 왼쪽 패널 맨 아래 다시하기 바로 위 (ResultPage) */
export const ARTWORK_GUIDE =
  '이런 날에는 아트워크의 디저트와 함께 노래를 감상해보세요!';

interface ArtworkDisplayProps {
  artwork: { url: string };
  emotionLabel: string;
  description: string;
  /** 공감 문구 아래에 감상 안내를 붙인다 — PC는 끄고 패널 맨 아래에 따로 둔다 */
  showGuide?: boolean;
}

function ArtworkDisplay({
  artwork,
  emotionLabel,
  description,
  showGuide = true,
}: ArtworkDisplayProps) {
  return (
    <div css={styles.artworkContainer}>
      <div css={styles.artworkWrapper}>
        <img
          src={artwork.url}
          alt={`${emotionLabel} 감정 아트워크`}
          css={styles.artworkImage}
        />
      </div>

      {/* 감정 정보 */}
      <div css={styles.artworkInfo}>
        <p css={styles.eyebrow}>오늘의 감정</p>
        <h2 css={styles.emotionalLabel}>{emotionLabel}</h2>
        <p css={styles.description}>{description}</p>
        {showGuide && <p css={styles.guideText}>{ARTWORK_GUIDE}</p>}
      </div>
    </div>
  );
}

export default ArtworkDisplay;
