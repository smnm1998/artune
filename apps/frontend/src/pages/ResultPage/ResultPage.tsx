import { useRef, useState } from 'react';
import { motion, useIsPresent } from 'framer-motion';
import { IoArrowBack } from 'react-icons/io5';
import type { PlaylistMode } from '@artune/shared-types';
import { Track } from '@/types/track';
import { QUERIES } from '@/constants/breakpoints';
import { SCREEN_TRACK_COUNT } from '@/constants/playlist';
import {
  ArtworkDisplay,
  ArtworkDisplaySkeleton,
  ARTWORK_GUIDE,
  BrandHome,
  CrisisNotice,
  PlaylistToggle,
  AlbumGrid,
  ActionButtons,
  MobilePlayerModal,
} from '@/components';
import useAppStore from '@/stores/useAppStore';
import useMediaQuery from '@/hooks/ui/useMediaQuery';
import useConfirmRestart from '@/hooks/ui/useConfirmRestart';
import { NOTICES } from '@/constants/notices';
import {
  scrollAreaStyle,
  headerStyle,
  containerStyle,
  sidePanelStyle,
  sideMainStyle,
  sideFooterStyle,
  sideGuideStyle,
  trackSectionStyle,
  trackHeaderStyle,
  headingStyle,
  titleRowStyle,
  sectionTitleStyle,
  statusStyle,
  liveDotStyle,
  countStyle,
  modeDescriptionStyle,
  mobileMusicHeaderStyle,
  backButtonStyle,
  toggleWrapperStyle,
  playlistStyle,
  emptyStateStyle,
  footerStyle,
} from './ResultPage.styles';

type ViewMode = 'artwork' | 'music';

/**
 * 감정 분석 결과 페이지 — 스트림이 열리면 바로 들어와 받는 대로 채운다.
 * - 머리말 전(약 2초): 아트워크·감정·공감 문구 자리는 스켈레톤
 * - 곡: 모드마다 10칸을 받은 곡이 앞에서부터 채우고, 다 받기 전에는 "곡을 고르고 있어요 n / 10"
 * - 끝났는데 10곡이 안 되면 남은 칸은 지우고, 0곡이면 빈 목록 안내 (도중 실패 포함)
 * - PC(>1024px): 3:7 — 왼쪽 감정 결과 패널(스크롤해도 제자리) · 오른쪽 소개 카드 1곡 + 3열 9곡
 * - 좁은 화면: 감정 결과 뷰 → '추천곡 보기'로 추천곡 뷰(2열)
 */
function ResultPage() {
  const liveResult = useAppStore((state) => state.emotionResult);
  const isLoading = useAppStore((state) => state.isLoading);
  // 다시하기는 결과를 비우고 입력 화면으로 바꾼다 — 이 화면이 사라지는(교차 페이드) 동안에는 마지막 결과를 그대로 그린다.
  // 비운 결과를 그대로 따르면 나가는 동안 빈 화면만 흐려진다 (11/27 측정: 결과 쪽 투명도가 처음부터 없음)
  const isPresent = useIsPresent();
  const [lastResult, setLastResult] = useState(liveResult);
  if (liveResult && liveResult !== lastResult) setLastResult(liveResult);
  const emotionResult = liveResult ?? (isPresent ? null : lastResult);
  const [selectedMode, setSelectedMode] = useState<PlaylistMode>('immerse');
  const [viewMode, setViewMode] = useState<ViewMode>('artwork');
  // 두 뷰가 같은 스크롤 상자를 쓴다 — 바꿀 때 맨 위로 올리지 않으면 앞 뷰에서 내린 위치 그대로 다음 뷰가 뜬다
  const scrollRef = useRef<HTMLDivElement>(null);
  const switchView = (next: ViewMode) => {
    setViewMode(next);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  // 좁은 화면에서 누른 곡 — 플레이어 모달로 연다. 닫을 때는 곡을 남겨 둬 닫히는 동안 그 곡으로 페이드아웃
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const openPlayer = (track: Track) => {
    setSelectedTrack(track);
    setIsPlayerOpen(true);
  };
  // ARTUNE(홈)도 다시하기와 같다 — 결과를 버리기 전에 묻는다
  const handleHome = useConfirmRestart();
  const isCompactView = useMediaQuery(QUERIES.compact);

  if (!emotionResult && !isLoading) return null;
  const playlists = emotionResult?.playlists;
  const playlist = playlists?.[selectedMode];
  const tracks = playlist?.tracks ?? [];
  const pending = isLoading
    ? Math.max(0, SCREEN_TRACK_COUNT - tracks.length)
    : 0;

  // "추천곡" + 고르는 중 상태 · 그 아래 모드 설명(머리말과 함께 온다)
  const trackHeading = (
    <div css={headingStyle}>
      <div css={titleRowStyle}>
        <h2 css={sectionTitleStyle}>추천곡</h2>
        {pending > 0 && (
          <p css={statusStyle} role="status">
            <span css={liveDotStyle} aria-hidden="true" />
            곡을 고르고 있어요
            {/* 숫자는 곡마다 바뀐다 — 읽어 주기는 처음 한 번만 */}
            <span css={countStyle} aria-hidden="true">
              {tracks.length} / {SCREEN_TRACK_COUNT}
            </span>
          </p>
        )}
      </div>
      <p css={modeDescriptionStyle}>{playlist?.description}</p>
    </div>
  );

  const toggle = (
    <PlaylistToggle
      selectedMode={selectedMode}
      onModeChange={setSelectedMode}
      immerseLabel={playlists?.immerse.modeLabel}
      sootheLabel={playlists?.soothe.modeLabel}
      size={isCompactView ? 'large' : 'small'}
    />
  );

  return (
    <div ref={scrollRef} css={scrollAreaStyle}>
      {/* 입력 화면과 같은 자리 — 교차 페이드 동안 로고가 움직이지 않는다 (좁은 화면 추천곡 뷰는 뒤로 · 토글이 맨 위) */}
      {(!isCompactView || viewMode === 'artwork') && (
        <header css={headerStyle}>
          <BrandHome onHome={handleHome} />
        </header>
      )}

      {/* 화면 전체의 나타남은 App의 교차 페이드가 맡는다 — 여기서 또 흐리게 시작하면 두 번 겹친다 */}
      <div css={containerStyle}>
        {(!isCompactView || viewMode === 'artwork') && (
          <div css={sidePanelStyle}>
            {/* 위기 안내 · 아트워크 · 감정 — 좁은 화면은 남은 높이의 위아래 가운데 */}
            <div css={sideMainStyle}>
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
                    // PC는 감상 안내를 패널 맨 아래 다시하기 바로 위에
                    showGuide={isCompactView}
                  />
                </motion.div>
              ) : (
                <ArtworkDisplaySkeleton />
              )}
            </div>

            <motion.div
              css={sideFooterStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {!isCompactView && emotionResult && (
                <p css={sideGuideStyle}>{ARTWORK_GUIDE}</p>
              )}
              <ActionButtons
                // 좁은 화면에서만 '추천곡 보기' (PC는 플레이리스트가 옆에 있다)
                onNext={isCompactView ? () => switchView('music') : undefined}
              />
            </motion.div>
          </div>
        )}

        {(!isCompactView || viewMode === 'music') && (
          <section css={trackSectionStyle}>
            {isCompactView ? (
              <>
                <div css={mobileMusicHeaderStyle}>
                  <button
                    type="button"
                    css={backButtonStyle}
                    onClick={() => switchView('artwork')}
                    aria-label="아트워크로 돌아가기"
                  >
                    <IoArrowBack size={22} />
                  </button>
                  <div css={toggleWrapperStyle}>{toggle}</div>
                </div>
                {trackHeading}
              </>
            ) : (
              // PC: 왼쪽 제목·상태·설명, 오른쪽 끝 작은 토글
              <div css={trackHeaderStyle}>
                {trackHeading}
                {toggle}
              </div>
            )}

            <motion.div
              key={selectedMode}
              css={playlistStyle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
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
                  featureFirst={!isCompactView}
                />
              )}
            </motion.div>
          </section>
        )}

        <MobilePlayerModal
          isOpen={isPlayerOpen}
          onClose={() => setIsPlayerOpen(false)}
          track={selectedTrack}
        />
      </div>

      {/* 맨 아래 고지 — 두 뷰(아트워크·플레이리스트) 모두 이 아래에 온다. 상표 문구는 사이트에 한 번 */}
      <footer css={footerStyle}>
        <p>{NOTICES.AI_RESULT}</p>
        <p>{NOTICES.TRADEMARK}</p>
      </footer>
    </div>
  );
}

export default ResultPage;
