import { motion, AnimatePresence } from 'framer-motion';
import { IoPlayCircle, IoWarning } from 'react-icons/io5';
import useAudioScratch from '@/hooks/audio/useAudioScratch';
import { Track } from '@/types/track';
import {
  modalOverlayStyle,
  modalContentStyle,
  albumInfoStyle,
  albumTitleStyle,
  artistNameStyle,
  trackNameStyle,
  playingIndicatorStyle,
} from './AlbumHoverModal.styles';

interface AlbumHoverModalProps {
  isOpen: boolean;
  album: Track;
}

function AlbumHoverModal({ isOpen, album }: AlbumHoverModalProps) {
  const hasPreviewUrl = !!album.preview_url?.trim();

  const { audioRef, isPlaying, error } = useAudioScratch({
    src: album.preview_url ?? undefined,
    isEnabled: isOpen && hasPreviewUrl,
    scratchDuration: 2,
  });

  const artistNames = album.artists.map((artist) => artist.name).join(', ');

  return (
    <>
      {hasPreviewUrl && (
        <audio
          ref={audioRef}
          src={isOpen ? (album.preview_url ?? undefined) : undefined}
          style={{ display: 'none' }}
        />
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            css={modalOverlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div css={modalContentStyle}>
              <div css={albumInfoStyle}>
                <p css={albumTitleStyle}>{album.album.name}</p>
                <p css={artistNameStyle}>{artistNames}</p>
                <p css={trackNameStyle}>추천곡: {album.name}</p>
              </div>

              <div css={playingIndicatorStyle}>
                {!hasPreviewUrl ? (
                  <>
                    <IoWarning size={24} />
                    <span>미리듣기 불가</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <IoPlayCircle size={24} />
                    <span>30초 미리듣기 재생 중...</span>
                  </>
                ) : error ? (
                  <>
                    <IoWarning size={24} />
                    <span>재생 불가: {error}</span>
                  </>
                ) : (
                  <>
                    <IoPlayCircle size={24} />
                    <span>재생 준비 중...</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AlbumHoverModal;
