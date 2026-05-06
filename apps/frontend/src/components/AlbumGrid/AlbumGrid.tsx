import { motion } from 'framer-motion';
import { useHover } from '@/hooks';
import { AlbumCard, AlbumHoverModal } from '@/components';
import { Track } from '@/types/track';
import { gridContainerStyle } from './AlbumGrid.styles';

interface AlbumGridProps {
  tracks: Track[];
  onTrackClick?: (track: Track) => void;
}

/**
 * 앨범 그리드 컴포넌트
 * @param {Object} props
 * @param {Array} props.tracks - 트랙 리스트
 * @param {Function} [props.onTrackClick] - 트랙 클릭 핸들러 (모바일용)
 */
function AlbumGrid({ tracks, onTrackClick }: AlbumGridProps) {
  const { handleMouseEnter, handleMouseLeave, isHovered } = useHover<string>();

  return (
    <div css={gridContainerStyle}>
      {tracks.map((track, index) => (
        <motion.div
          key={track.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.4 }}
          // [PC] Hover Interaction
          onMouseEnter={() => handleMouseEnter(track.id)}
          onMouseLeave={handleMouseLeave}
          // [Mobile/All] Click Interaction
          onClick={() => {
            if (onTrackClick) {
              onTrackClick(track);
            }
          }}
          style={{
            position: 'relative',
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // 모바일에서 롱프레스(우클릭 메뉴) 방지
            WebkitTouchCallout: 'none',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <AlbumCard album={track} isHovered={isHovered(track.id)} />

          {/* PC에서만 Hover 모달 표시 (onTrackClick이 없거나 PC 환경일 때) */}
          {/* 보통 onTrackClick이 있으면 모바일이라고 간주할 수 있음 */}
          {!onTrackClick && (
            <AlbumHoverModal isOpen={isHovered(track.id)} album={track} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default AlbumGrid;
