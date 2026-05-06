import * as styles from './ArtworkDisplay.styles';

interface ArtworkDisplayProps {
  artwork: { url: string; prompt: string };
  emotionLabel: string;
  description: string;
}

function ArtworkDisplay({
  artwork,
  emotionLabel,
  description,
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
        <h2 css={styles.emotionalLabel}>{emotionLabel}</h2>
        <p css={styles.description}>{description}</p>
        <p css={styles.guideText}>
          이런 날에는 아트워크의 디저트와 함께 노래를 감상해보세요!
        </p>
      </div>
    </div>
  );
}

export default ArtworkDisplay;
