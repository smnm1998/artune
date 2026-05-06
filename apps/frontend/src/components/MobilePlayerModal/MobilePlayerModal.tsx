import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoWarning } from 'react-icons/io5';
import { Track } from '@/types/track';
import useAudioScratch from '@/hooks/audio/useAudioScratch';
import * as styles from './MobilePlayerModal.styles';

interface MobilePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

function MobilePlayerModal({ isOpen, onClose, track }: MobilePlayerModalProps) {
  // 모달이 닫힐 때(track=null)에도 정보를 유지하기 위해 로컬 상태 사용
  const [currentTrack, setCurrentTrack] = useState<Track | null>(track);

  useEffect(() => {
    if (track) {
      setCurrentTrack(track);
    }
  }, [track]);

  // currentTrack이 없으면 아예 렌더링 안 함 (초기 상태)
  // 닫힐 때는 track은 null이지만 currentTrack은 남아있어서 애니메이션/페이드아웃 가능
  const activeTrack = track || currentTrack;

  const { audioRef, isPlaying, error } = useAudioScratch({
    src: activeTrack?.preview_url ?? undefined,
    // isOpen이 true이고 실제 track prop이 있을 때만 재생 (닫히면 isEnabled=false -> 페이드아웃)
    isEnabled: isOpen && !!track?.preview_url,
    scratchDuration: 1.5,
  });

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
                <div
                  style={{
                    color: '#ff6b6b',
                    fontSize: '13px',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <IoWarning />
                  <span>{error || '미리듣기를 제공하지 않는 곡입니다'}</span>
                </div>
              )}
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
