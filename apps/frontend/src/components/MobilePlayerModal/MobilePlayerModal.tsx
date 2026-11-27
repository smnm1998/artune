import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoWarning } from 'react-icons/io5';
import { Track } from '@/types/track';
import usePreviewAudio from '@/hooks/audio/usePreviewAudio';
import PreviewSource from '@/components/PreviewSource/PreviewSource';
import * as styles from './MobilePlayerModal.styles';

interface MobilePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 마지막으로 연 곡 — 닫혀도(isOpen=false) 남겨 둬야 닫히는 동안 그 곡으로 페이드아웃한다 */
  track: Track | null;
}

function MobilePlayerModal({ isOpen, onClose, track }: MobilePlayerModalProps) {
  const activeTrack = track;

  const { audioRef, isPlaying, error } = usePreviewAudio({
    src: activeTrack?.preview_url ?? undefined,
    // 열려 있을 때만 재생 (닫히면 isEnabled=false → 페이드아웃)
    isEnabled: isOpen && !!activeTrack?.preview_url,
    fadeOutSeconds: 1.5,
  });

  // 아직 한 번도 열지 않았다
  if (!activeTrack) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          css={styles.overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            css={styles.contentStyle}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 오디오 요소 (페이드아웃을 위해 닫히는 동안에도 DOM에 존재해야 함) */}
            <audio
              ref={audioRef}
              src={activeTrack.preview_url ?? undefined}
              preload="auto"
            />

            {/* CD 플레이어 (픽처 디스크) */}
            <div css={styles.vinylWrapperStyle} data-playing={isPlaying}>
              {/* 앨범 커버가 배경인 LP판 */}
              <div
                css={styles.vinylDiscStyle}
                style={{
                  backgroundImage: `url(${activeTrack.album.images[0]?.url})`,
                }}
              />
              {/* 입체적인 중앙 흰색 홀 */}
              <div css={styles.centerHoleStyle} />
            </div>

            {/* 곡 정보 */}
            <div css={styles.infoStyle}>
              <h3 css={styles.titleStyle}>{activeTrack.name}</h3>
              <p css={styles.artistStyle}>
                {activeTrack.artists.map((a) => a.name).join(', ')}
              </p>

              {(error || !activeTrack.preview_url) && (
                <div css={styles.errorStyle}>
                  <IoWarning />
                  <span>{error || '미리듣기를 제공하지 않는 곡입니다'}</span>
                </div>
              )}

              <PreviewSource url={activeTrack.appleMusicUrl} onDark />
            </div>

            {/* 닫기 버튼 */}
            <button
              css={styles.closeButtonStyle}
              onClick={onClose}
              aria-label="닫기"
            >
              <IoClose />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MobilePlayerModal;
