import * as styles from './Skeleton.styles';

/** 곡 카드 자리 — 커버 정사각형만 (CD 장식은 받은 곡 카드에만) */
export function AlbumCardSkeleton() {
  return <div css={styles.cover} data-skeleton="track" aria-hidden="true" />;
}

/** 머리말(아트워크 · 감정 · 공감 문구) 자리 — 감정이 정해지기 전 약 2초 */
export function ArtworkDisplaySkeleton() {
  return (
    <div
      css={styles.artworkContainer}
      data-skeleton="artwork"
      aria-hidden="true"
    >
      <div css={styles.artworkSquare} />
      <div css={styles.artworkInfo}>
        <div css={styles.line('30%', 36)} />
        <div css={styles.line('80%', 16)} />
        <div css={styles.line('60%', 16)} />
      </div>
    </div>
  );
}
