import * as styles from './Skeleton.styles';

/** 커버 자리 — 곡 하나의 자리라 data-skeleton="track" (격자 칸 · 소개 카드 커버 모두) */
export function CoverSkeleton() {
  return <div css={styles.cover} data-skeleton="track" aria-hidden="true" />;
}

/** 글줄 자리 — 곡명 · 가수 · 감정 이름처럼 길이만 다른 회색 줄 */
export function LineSkeleton({
  width,
  height,
}: {
  width: string;
  height: number;
}) {
  return <div css={styles.line(width, height)} aria-hidden="true" />;
}

/** 격자 곡 칸 — 커버 정사각형 + 곡명 · 가수 두 줄 */
export function AlbumCardSkeleton() {
  return (
    <div css={styles.trackSlot}>
      <CoverSkeleton />
      <div css={styles.trackLines}>
        <LineSkeleton width="72%" height={14} />
        <LineSkeleton width="44%" height={12} />
      </div>
    </div>
  );
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
        <LineSkeleton width="24%" height={13} />
        <LineSkeleton width="36%" height={28} />
        <LineSkeleton width="92%" height={15} />
        <LineSkeleton width="64%" height={15} />
      </div>
    </div>
  );
}
