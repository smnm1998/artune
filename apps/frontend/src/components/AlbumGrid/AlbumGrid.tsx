import { motion } from 'framer-motion';
import useHover from '@/hooks/ui/useHover';
import { AlbumCard, AlbumHoverModal, AlbumCardSkeleton } from '@/components';
import { Track } from '@/types/track';
import { gridContainerStyle, gridItemStyle } from './AlbumGrid.styles';

interface AlbumGridProps {
  tracks: Track[];
  /** 아직 오지 않은 곡 칸 수 — 받은 곡 뒤를 스켈레톤으로 채운다 */
  pending?: number;
  /** hover: PC — 마우스를 올리면 정보 카드와 미리듣기 / tap: 좁은 화면 — 누르면 onTrackClick(플레이어 모달) */
  interaction: 'hover' | 'tap';
  onTrackClick?: (track: Track) => void;
}

/** 앨범 그리드 — 받은 곡은 CD 카드로, 남은 자리는 스켈레톤으로 */
function AlbumGrid({
  tracks,
  pending = 0,
  interaction,
  onTrackClick,
}: AlbumGridProps) {
  const { handleMouseEnter, handleMouseLeave, isHovered } = useHover<string>();

  return (
    <div css={gridContainerStyle} aria-busy={pending > 0}>
      {tracks.map((track) => (
        <motion.div
          key={track.id}
          css={gridItemStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onMouseEnter={() => handleMouseEnter(track.id)}
          onMouseLeave={handleMouseLeave}
          onClick={
            interaction === 'tap' ? () => onTrackClick?.(track) : undefined
          }
          onContextMenu={(e) => e.preventDefault()}
        >
          <AlbumCard album={track} isHovered={isHovered(track.id)} />
          {interaction === 'hover' && (
            <AlbumHoverModal isOpen={isHovered(track.id)} album={track} />
          )}
        </motion.div>
      ))}
      {Array.from({ length: pending }, (_, i) => (
        <div key={`pending-${i}`}>
          <AlbumCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export default AlbumGrid;
