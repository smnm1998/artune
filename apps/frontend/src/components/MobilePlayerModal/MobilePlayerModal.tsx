import { motion, AnimatePresence } from 'framer-motion';
import { IoWarning } from 'react-icons/io5';
import { Track } from '@/types/track';
import usePreviewAudio, {
  PREVIEW_WAITING_DELAY_MS,
} from '@/hooks/audio/usePreviewAudio';
import useDelayedFlag from '@/hooks/ui/useDelayedFlag';
import PreviewSource from '@/components/PreviewSource/PreviewSource';
import Equalizer from '@/components/Equalizer/Equalizer';
import * as styles from './MobilePlayerModal.styles';

interface MobilePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 마지막으로 연 곡 — 닫혀도(isOpen=false) 남겨 둬야 닫히는 동안 그 곡으로 페이드아웃한다 */
  track: Track | null;
}

/**
 * 좁은 화면 플레이어 — 추천곡 화면 위에 어두운 막 + 흐림을 덧대고, 커버를 돌아가는 CD로 보여 준다.
 * 위에서부터 CD · 곡명 · 가수 · 앨범 · 미리듣기 상태 · Apple Music 배지, 맨 아래 흰 닫기 버튼 (목업). 막의 빈 곳을 눌러도 닫힌다
 */
function MobilePlayerModal({ isOpen, onClose, track }: MobilePlayerModalProps) {
  const activeTrack = track;

  const { audioRef, isPlaying, error, isEnded } = usePreviewAudio({
    src: activeTrack?.preview_url ?? undefined,
    // 열려 있을 때만 재생 (닫히면 isEnabled=false → 페이드아웃)
    isEnabled: isOpen && !!activeTrack?.preview_url,
    fadeOutSeconds: 1.5,
  });
  // 받는 중이 0.4초를 넘길 때만 '재생 준비 중' — 금방 재생되면 빈 줄에서 바로 '재생 중'으로
  const hasPreview = !!activeTrack?.preview_url;
  const showWaiting = useDelayedFlag(
    isOpen && hasPreview && !isPlaying && !error && !isEnded,
    PREVIEW_WAITING_DELAY_MS,
  );

  // 아직 한 번도 열지 않았다
  if (!activeTrack) return null;

  // 안의 내용을 눌러도 막까지 올라가 닫히지 않게
  const stop = (e: React.MouseEvent) => e.stopPropagation();

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
          {/* 오디오 요소 (페이드아웃을 위해 닫히는 동안에도 DOM에 존재해야 함) */}
          <audio
            ref={audioRef}
            src={activeTrack.preview_url ?? undefined}
            preload="auto"
          />

          <div css={styles.stageStyle}>
            <motion.div
              css={styles.contentStyle}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              onClick={stop}
            >
              {/* CD (커버가 그려진 픽처 디스크) — 재생 중에만 돈다 */}
              <div css={styles.vinylWrapperStyle} data-playing={isPlaying}>
                <div
                  css={styles.vinylDiscStyle}
                  style={{
                    backgroundImage: `url(${activeTrack.album.images[0]?.url})`,
                  }}
                />
                <div css={styles.centerHoleStyle} />
              </div>

              {/* 곡 정보 */}
              <div css={styles.infoStyle}>
                <h3 css={styles.titleStyle}>{activeTrack.name}</h3>
                <p css={styles.artistStyle}>
                  {activeTrack.artists.map((a) => a.name).join(', ')}
                </p>
                <p css={styles.albumStyle}>{activeTrack.album.name}</p>
              </div>

              {/* 미리듣기 상태 — 배경·테두리 없이 글자만 */}
              <p
                css={styles.statusStyle}
                data-waiting={showWaiting}
                data-ended={isEnded}
              >
                {!hasPreview || error ? (
                  <>
                    <IoWarning aria-hidden="true" />
                    <span>{error || '미리듣기를 제공하지 않는 곡입니다'}</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <Equalizer css={styles.equalizerStyle} />
                    <span>30초 미리듣기 재생 중</span>
                  </>
                ) : isEnded ? (
                  <span>미리듣기가 끝났어요</span>
                ) : showWaiting ? (
                  <span>재생 준비 중...</span>
                ) : null}
              </p>

              <PreviewSource url={activeTrack.appleMusicUrl} onDark />
            </motion.div>
          </div>

          <div css={styles.closeBarStyle} onClick={stop}>
            <button
              type="button"
              css={styles.closeButtonStyle}
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MobilePlayerModal;
