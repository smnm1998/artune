import { css, keyframes } from '@emotion/react';
import { colors } from '@/styles/theme';

const pulse = keyframes`
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

// PC(>1024) 호버에서만 열린다 — 좁은 화면은 플레이어 모달(MobilePlayerModal)이라 모바일 글자 크기 규칙이 없다
export const modalOverlayStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: ${colors.glass.overlay};
  backdrop-filter: ${colors.glass.overlayBlur};
  -webkit-backdrop-filter: ${colors.glass.overlayBlur};
  border-radius: 14px; /* 커버(AlbumCard)와 같은 모서리 */
  display: flex;
  align-items: center;
  justify-content: center;
  /* 카드 폭이 200~300px(소개 카드 240)로 달라서, 안쪽 여백·간격을 카드 크기에 비례시키려고 크기 컨테이너로 둔다 */
  container-type: size;
`;

// 모달 콘텐츠
export const modalContentStyle = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  /* 큰 덩어리(곡 정보 · 미리듣기 상태 · Apple Music) 사이와 안쪽 여백 — 카드가 클수록 넓게, 작아도 최소는 지킨다 */
  gap: clamp(12px, 7cqh, 26px);
  padding: clamp(14px, 7cqw, 28px);
`;

// 앨범 타이틀
export const albumTitleStyle = css`
  font-size: 16px;
  font-weight: 700;
  color: ${colors.text.primary};
  line-height: 1.4;

  // 긴 제목 처리
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;

  /* 작은 카드(높이 240px 이하)에서는 한 줄로 — 아래 줄들(미리듣기·배지·출처)이 들어갈 자리를 남긴다 */
  @container (max-height: 240px) {
    -webkit-line-clamp: 1;
  }
`;

// 앨범 정보 (앨범명 · 가수 · 추천곡) — 줄 사이를 살짝 띄운다. 줄임 처리는 각 줄 스타일이 맡는다
export const albumInfoStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

// 아티스트 이름
export const artistNameStyle = css`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.text.secondary};
  line-height: 1.3;
`;

// 대표곡
export const trackNameStyle = css`
  font-size: 13px;
  font-weight: 400;
  color: ${colors.text.secondary};
  line-height: 1.3;

  // 긴 제목 처리
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// 미리듣기 상태 줄 — 격자 칸 13px, 작은 칸(소개 카드 240 이하)은 12px (목업)
export const playingIndicatorStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${colors.accent.base};
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  /* 상태가 바뀌어도(빈 줄 · 아이콘 24 · 막대 14) 아래 배지가 움직이지 않게 */
  min-height: 24px;

  /* 끝까지 들은 뒤 — 누를 것도 재생 중도 아니라 회색 */
  &[data-ended='true'] {
    color: ${colors.text.tertiary};
  }

  /* 재생 준비 중에만 깜빡인다 */
  &[data-waiting='true'] {
    animation: ${pulse} 2s ease-in-out infinite;
  }

  @container (max-height: 240px) {
    font-size: 12px;
    line-height: 17px;
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-waiting='true'] {
      animation: none;
    }
  }
`;

// 재생 중 이퀄라이저(Equalizer) 높이 — 격자 칸 14, 작은 칸(소개 카드) 12
export const equalizerStyle = css`
  height: 14px;

  @container (max-height: 240px) {
    height: 12px;
  }
`;
