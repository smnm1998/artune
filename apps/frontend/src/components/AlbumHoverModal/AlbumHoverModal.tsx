import { motion, AnimatePresence } from 'framer-motion';
import { IoPlayCircle, IoWarning } from 'react-icons/io5';
import usePreviewAudio from '@/hooks/audio/usePreviewAudio';
import PreviewSource from '@/components/PreviewSource/PreviewSource';
import { Track } from '@/types/track';
import {
  modalOverlayStyle,
  modalContentStyle,
  albumInfoStyle,
  albumTitleStyle,
  artistNameStyle,
  trackNameStyle,
  playingIndicatorStyle,
  equalizerStyle,
} from './AlbumHoverModal.styles';

interface AlbumHoverModalProps {
  isOpen: boolean;
  album: Track;
}

function AlbumHoverModal({ isOpen, album }: AlbumHoverModalProps) {
  const hasPreviewUrl = !!album.preview_url?.trim();

  const { audioRef, isPlaying, error } = usePreviewAudio({
    src: album.preview_url ?? undefined,
    isEnabled: isOpen && hasPreviewUrl,
    fadeOutSeconds: 2,
  });

  const artistNames = album.artists.map((artist) => artist.name).join(', ');

  return (
    <>
      {hasPreviewUrl && (
        <audio
          ref={audioRef}
          src={isOpen ? (album.preview_url ?? undefined) : undefined}
          hidden
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

              {/* 깜빡임은 '재생 준비 중'에만 — 재생 중은 막대가 움직이고, 불가는 멈춰 있다 */}
              <div
                css={playingIndicatorStyle}
                data-waiting={hasPreviewUrl && !isPlaying && !error}
              >
                {!hasPreviewUrl ? (
                  <>
                    <IoWarning size={24} />
                    <span>미리듣기 불가</span>
                  </>
                ) : isPlaying ? (
                  <>
                    {/* 이퀄라이저 — 막대 셋이 엇갈려 오르내린다 (목업) */}
                    <span
                      css={equalizerStyle}
                      data-testid="equalizer"
                      aria-hidden="true"
                    >
                      <span />
                      <span />
                      <span />
                    </span>
                    <span>30초 미리듣기 재생 중</span>
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

              <PreviewSource url={album.appleMusicUrl} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AlbumHoverModal;
