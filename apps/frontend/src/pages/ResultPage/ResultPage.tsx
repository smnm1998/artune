import { useState } from 'react';
import { motion } from 'framer-motion';
import { IoArrowBack } from 'react-icons/io5';
import type { PlaylistMode } from '@artune/shared-types';
import { Track } from '@/types/track';
import { BREAKPOINTS } from '@/constants/breakpoints';
import { SCREEN_TRACK_COUNT } from '@/constants/playlist';
import {
  ArtworkDisplay,
  ArtworkDisplaySkeleton,
  CrisisNotice,
  PlaylistToggle,
  AlbumGrid,
  ActionButtons,
  MobilePlayerModal,
} from '@/components';
import useAppStore from '@/stores/useAppStore';
import useMediaQuery from '@/hooks/ui/useMediaQuery';
import { NOTICES } from '@/constants/notices';
import {
  containerStyle,
  leftSectionStyle,
  rightSectionStyle,
  mobileMusicHeaderStyle,
  backButtonStyle,
  toggleWrapperStyle,
  actionButtonWrapperStyle,
  playlistStyle,
  statusStyle,
  emptyStateStyle,
  footerStyle,
} from './ResultPage.styles';

type ViewMode = 'artwork' | 'music';

/**
 * 감정 분석 결과 페이지 — 스트림이 열리면 바로 들어와 받는 대로 채운다.
 * - 머리말 전(약 2초): 아트워크·감정·공감 문구 자리는 스켈레톤
 * - 곡: 모드마다 10칸을 받은 곡이 앞에서부터 채우고, 다 받기 전에는 "곡을 고르고 있어요"
 * - 끝났는데 10곡이 안 되면 남은 칸은 지우고, 0곡이면 빈 목록 안내 (도중 실패 포함)
 * - PC(>1024px): 아트워크와 플레이리스트가 나란히 / 좁은 화면: 아트워크 뷰 → '음악 보기'로 플레이리스트 뷰
 */
function ResultPage() {
  const emotionResult = useAppStore((state) => state.emotionResult);
  const isLoading = useAppStore((state) => state.isLoading);
  const [selectedMode, setSelectedMode] = useState<PlaylistMode>('immerse');
  const [viewMode, setViewMode] = useState<ViewMode>('artwork');
  // 좁은 화면에서 누른 곡 — 플레이어 모달로 연다. 닫을 때는 곡을 남겨 둬 닫히는 동안 그 곡으로 페이드아웃
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const openPlayer = (track: Track) => {
    setSelectedTrack(track);
    setIsPlayerOpen(true);
  };
  const isCompactView = useMediaQuery(`(max-width: ${BREAKPOINTS.compact}px)`);

  if (!emotionResult && !isLoading) return null;
  const playlists = emotionResult?.playlists;
  const tracks = playlists?.[selectedMode].tracks ?? [];
  const pending = isLoading
    ? Math.max(0, SCREEN_TRACK_COUNT - tracks.length)
    : 0;

  return (
    <>
      <motion.div
        css={containerStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {(!isCompactView || viewMode === 'artwork') && (
          <div css={leftSectionStyle}>
            {emotionResult?.crisis && <CrisisNotice />}
            {emotionResult ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ArtworkDisplay
                  artwork={emotionResult.artwork}
                  emotionLabel={emotionResult.emotionLabel}
                  description={emotionResult.description}
                />
              </motion.div>
            ) : (
              <ArtworkDisplaySkeleton />
            )}

            <motion.div
              css={actionButtonWrapperStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <ActionButtons
                // 좁은 화면에서만 '음악 보기' (PC는 플레이리스트가 옆에 있다)
                onNext={isCompactView ? () => setViewMode('music') : undefined}
              />
            </motion.div>
          </div>
        )}

        {(!isCompactView || viewMode === 'music') && (
          <div css={rightSectionStyle}>
            <div css={mobileMusicHeaderStyle}>
              {isCompactView && (
                <button
                  css={backButtonStyle}
                  onClick={() => setViewMode('artwork')}
                  aria-label="아트워크로 돌아가기"
                >
                  <IoArrowBack size={24} />
                </button>
              )}

              <div css={toggleWrapperStyle}>
                <PlaylistToggle
                  selectedMode={selectedMode}
                  onModeChange={setSelectedMode}
                  immerseLabel={playlists?.immerse.modeLabel}
                  sootheLabel={playlists?.soothe.modeLabel}
                  // 툴팁은 PC에서만 (터치에서는 누르기를 방해한다)
                  immerseDescription={
                    !isCompactView ? playlists?.immerse.description : undefined
                  }
                  sootheDescription={
                    !isCompactView ? playlists?.soothe.description : undefined
                  }
                />
              </div>
            </div>

            <motion.div
              key={selectedMode}
              css={playlistStyle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {pending > 0 && (
                <p css={statusStyle} role="status">
                  곡을 고르고 있어요
                </p>
              )}
              {tracks.length === 0 && !isLoading ? (
                <div css={emptyStateStyle}>
                  <div className="empty-icon">🎵</div>
                  <h3>플레이리스트를 찾을 수 없어요</h3>
                  <p>
                    죄송합니다. 지금은 추천할 수 있는 음악이 없어요.
                    <br />
                    다른 감정을 입력하거나 잠시 후 다시 시도해주세요.
                  </p>
                </div>
              ) : (
                <AlbumGrid
                  tracks={tracks}
                  pending={pending}
                  interaction={isCompactView ? 'tap' : 'hover'}
                  onTrackClick={openPlayer}
                />
              )}
            </motion.div>
          </div>
        )}

        <MobilePlayerModal
          isOpen={isPlayerOpen}
          onClose={() => setIsPlayerOpen(false)}
          track={selectedTrack}
        />
      </motion.div>

      {/* 맨 아래 고지 — 두 뷰(아트워크·플레이리스트) 모두 이 아래에 온다. 상표 문구는 사이트에 한 번 */}
      <footer css={footerStyle}>
        <p>{NOTICES.AI_RESULT}</p>
        <p>{NOTICES.TRADEMARK}</p>
      </footer>
    </>
  );
}

export default ResultPage;
