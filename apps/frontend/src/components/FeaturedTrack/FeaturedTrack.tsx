import { motion } from 'framer-motion';
import { LuMousePointer } from 'react-icons/lu';
import AlbumCard from '@/components/AlbumCard/AlbumCard';
import { CoverSkeleton, LineSkeleton } from '@/components/Skeleton/Skeleton';
import { Track } from '@/types/track';
import {
  cardStyle,
  coverStyle,
  infoStyle,
  eyebrowStyle,
  titleStyle,
  subtitleStyle,
  guideStyle,
  guideIconStyle,
  skeletonLinesStyle,
} from './FeaturedTrack.styles';

interface FeaturedTrackProps {
  /** 첫 곡 — 아직 안 왔으면 커버·글줄은 스켈레톤, 안내 상자는 그대로 */
  track?: Track;
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * PC 추천곡 맨 위 소개 카드 — 첫 곡을 크게 보여 주며 듣는 법(커버에 마우스 → 30초 미리듣기)을 알려 준다.
 * 호버 정보 카드·배지는 격자 곡과 같다 (배지는 열린 곡에만 — 화면에 하나)
 */
function FeaturedTrack({
  track,
  isOpen,
  onMouseEnter,
  onMouseLeave,
}: FeaturedTrackProps) {
  return (
    <div css={cardStyle}>
      {track ? (
        <motion.div
          css={coverStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        >
          <AlbumCard album={track} hoverInfo isOpen={isOpen} />
        </motion.div>
      ) : (
        <div css={coverStyle}>
          <CoverSkeleton />
        </div>
      )}

      <div css={infoStyle}>
        <p css={eyebrowStyle}>먼저 들어보세요</p>
        {track ? (
          <>
            <h3 css={titleStyle}>{track.name}</h3>
            <p css={subtitleStyle}>
              {track.artists.map((artist) => artist.name).join(', ')} ·{' '}
              {track.album.name}
            </p>
          </>
        ) : (
          <div css={skeletonLinesStyle}>
            <LineSkeleton width="56%" height={24} />
            <LineSkeleton width="38%" height={15} />
          </div>
        )}
        <p css={guideStyle}>
          <LuMousePointer css={guideIconStyle} aria-hidden="true" />
          <span>
            커버에 마우스를 올리면 30초 미리듣기가 재생돼요. 아래 곡들도 똑같이
            들을 수 있어요.
          </span>
        </p>
      </div>
    </div>
  );
}

export default FeaturedTrack;
