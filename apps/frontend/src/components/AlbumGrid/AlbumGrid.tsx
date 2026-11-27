import { motion } from 'framer-motion';
import useHover from '@/hooks/ui/useHover';
import { AlbumCard, AlbumCardSkeleton, FeaturedTrack } from '@/components';
import { Track } from '@/types/track';
import {
  listStyle,
  gridContainerStyle,
  gridItemStyle,
  trackMetaStyle,
  trackTitleStyle,
  trackArtistStyle,
} from './AlbumGrid.styles';

interface AlbumGridProps {
  tracks: Track[];
  /** 아직 오지 않은 곡 칸 수 — 받은 곡 뒤를 스켈레톤으로 채운다 */
  pending?: number;
  /** hover: PC — 마우스를 올리면 정보 카드와 미리듣기 / tap: 좁은 화면 — 누르면 onTrackClick(플레이어 모달) */
  interaction: 'hover' | 'tap';
  onTrackClick?: (track: Track) => void;
  /** PC — 첫 곡은 소개 카드(FeaturedTrack)로 크게, 나머지 9곡은 그 아래 3열 격자로 */
  featureFirst?: boolean;
}

/**
 * 추천곡 목록 — 받은 곡은 커버 + 곡명 · 가수, 남은 자리는 스켈레톤.
 * 마우스가 올라간 곡은 목록 전체에서 하나(useHover) — 소개 카드와 격자가 같은 상태를 써서 배지가 화면에 하나만 뜬다
 */
function AlbumGrid({
  tracks,
  pending = 0,
  interaction,
  onTrackClick,
  featureFirst = false,
}: AlbumGridProps) {
  const { handleMouseEnter, handleMouseLeave, isHovered } = useHover<string>();
  const hoverInfo = interaction === 'hover';

  const featured = featureFirst ? tracks[0] : undefined;
  const gridTracks = featureFirst ? tracks.slice(1) : tracks;
  // 첫 곡이 아직이면 소개 카드가 그 한 칸을 스켈레톤으로 맡는다
  const gridPending =
    featureFirst && !featured ? Math.max(0, pending - 1) : pending;
  const showFeatured = featureFirst && (featured || pending > 0);

  return (
    <div css={listStyle} aria-busy={pending > 0}>
      {showFeatured && (
        <FeaturedTrack
          track={featured}
          isOpen={!!featured && isHovered(featured.id)}
          onMouseEnter={() => featured && handleMouseEnter(featured.id)}
          onMouseLeave={handleMouseLeave}
        />
      )}

      <div css={gridContainerStyle(featureFirst)}>
        {gridTracks.map((track) => (
          <motion.div
            key={track.id}
            css={gridItemStyle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onMouseEnter={() => handleMouseEnter(track.id)}
            onMouseLeave={handleMouseLeave}
            onClick={hoverInfo ? undefined : () => onTrackClick?.(track)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <AlbumCard
              album={track}
              hoverInfo={hoverInfo}
              isOpen={isHovered(track.id)}
            />
            <div css={trackMetaStyle}>
              <p css={trackTitleStyle}>{track.name}</p>
              <p css={trackArtistStyle}>
                {track.artists.map((artist) => artist.name).join(', ')}
              </p>
            </div>
          </motion.div>
        ))}
        {Array.from({ length: gridPending }, (_, i) => (
          <AlbumCardSkeleton key={`pending-${i}`} />
        ))}
      </div>
    </div>
  );
}

export default AlbumGrid;
