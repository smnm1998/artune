import { motion } from 'framer-motion';
import { Track } from '@/types/track';
import {
  cardContainerStyle,
  albumWrapperStyle,
  vinylDiscStyle,
  vinylCenterStyle,
  albumCoverStyle,
} from './AlbumCard.styles';

interface AlbumCardProps {
  album: Track;
  isHovered: boolean;
}

function AlbumCard({ album, isHovered }: AlbumCardProps) {
  // 앨범 커버 이미지 URL (첫 번째 이미지 사용)
  const coverUrl = album.album.images[0]?.url || '';

  // 이미지 로딩 에러 핸들러
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div css={cardContainerStyle}>
      <div css={albumWrapperStyle}>
        {/* CD 앨범 + CD 디스크 영역 */}
        <motion.div
          css={vinylDiscStyle}
          animate={{
            left: isHovered ? 0 : '15%',
          }}
          transition={{
            duration: 0.3, // 0.3초에 이동
            ease: 'easeOut', // 부드럽게 감속
          }}
        >
          {/* CD 중앙 디테일 */}
          <div css={vinylCenterStyle} />
        </motion.div>

        {/* 앨범 커버 */}
        <motion.div
          css={albumCoverStyle}
          whileHover={{ scale: 1.05 }} // 확대
          transition={{ duration: 0.3 }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={album.name}
              onError={handleImageError}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
              }}
            >
              No Image
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default AlbumCard;
