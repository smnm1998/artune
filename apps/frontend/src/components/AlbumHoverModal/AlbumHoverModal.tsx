import { motion, AnimatePresence } from 'framer-motion';
import { IoPlayCircle, IoWarning } from 'react-icons/io5';
import usePreviewAudio, {
  PREVIEW_WAITING_DELAY_MS,
} from '@/hooks/audio/usePreviewAudio';
import useDelayedFlag from '@/hooks/ui/useDelayedFlag';
import PreviewSource from '@/components/PreviewSource/PreviewSource';
import Equalizer from '@/components/Equalizer/Equalizer';
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
  // 받는 중이 0.4초를 넘길 때만 '재생 준비 중' — 금방 재생되면 빈 줄에서 바로 '재생 중'으로
  const showWaiting = useDelayedFlag(
    isOpen && hasPreviewUrl && !isPlaying && !error,
    PREVIEW_WAITING_DELAY_MS,
  );

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

              {/* 깜빡임은 '재생 준비 중'에만 — 재생 중은 막대가 움직이고, 불가는 멈춰 있다. 비어 있어도 줄 높이는 지킨다 */}
              <div css={playingIndicatorStyle} data-waiting={showWaiting}>
                {!hasPreviewUrl ? (
                  <>
                    <IoWarning size={24} />
                    <span>미리듣기 불가</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <Equalizer css={equalizerStyle} />
                    <span>30초 미리듣기 재생 중</span>
                  </>
                ) : error ? (
                  <>
                    <IoWarning size={24} />
                    <span>재생 불가: {error}</span>
                  </>
                ) : showWaiting ? (
                  <>
                    <IoPlayCircle size={24} />
                    <span>재생 준비 중...</span>
                  </>
                ) : null}
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
