/**
 * 색 — 회백색 단색 바탕 · 유리는 한 겹(흰색 72%) · 초록은 누를 것과 재생 중에만 (11/27 리디자인, 목업 "Light Glass · Green")
 * 대비는 바탕 #F2F4F6 기준: 글자 1 15.0 · 글자 2 6.5 · 글자 3 4.9 · 초록 4.9 · 초록 위 흰 글자 5.4 · 오류 5.0 (모두 4.5:1 이상)
 */
export const colors = {
  background: {
    page: '#F2F4F6', // 화면 바탕 (단색)
    surface: '#FFFFFF', // 단색 면 · 토글의 고른 칸
  },

  // 유리 — 한 겹만 쓴다(유리 위에 유리를 겹치지 않는다)
  glass: {
    panel: 'rgba(255, 255, 255, 0.72)', // 패널 · 입력 카드 · 보조 버튼
    overlay: 'rgba(255, 255, 255, 0.88)', // 커버 위 호버 정보 카드
    blur: 'blur(24px) saturate(160%)',
    overlayBlur: 'blur(14px) saturate(160%)',
  },

  // 바탕보다 살짝 진한 칠 — 토글 바닥 · 보조 버튼 · 스켈레톤
  fill: {
    subtle: 'rgba(25, 31, 40, 0.05)',
    hover: 'rgba(25, 31, 40, 0.09)',
    skeleton: 'rgba(25, 31, 40, 0.06)',
  },

  text: {
    primary: '#191F28', // 제목 · 본문
    secondary: '#4E5968', // 설명 · 가수
    tertiary: '#5F6B78', // 안내 · 고지 · 글자 수
    placeholder: '#6B7684',
    disabled: '#8B95A1',
    onAccent: '#FFFFFF', // 초록 버튼 위
    inverse: '#FFFFFF', // 어두운 막 위(모바일 플레이어)
    inverseSecondary: '#E5E8EB',
  },

  border: {
    subtle: 'rgba(25, 31, 40, 0.06)', // 패널 · 카드
    default: 'rgba(25, 31, 40, 0.1)',
    focus: 'rgba(11, 122, 69, 0.55)', // 입력 중인 칸
  },

  accent: {
    base: '#0B7A45',
    hover: '#096A3C',
    /** 어두운 막 위의 장식(재생 막대 등) — 글자에는 쓰지 않는다 */
    bright: '#4ADE80',
  },

  shadow: {
    panel:
      '0 1px 2px rgba(25, 31, 40, 0.04), 0 8px 24px rgba(25, 31, 40, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    cover: '0 8px 20px rgba(25, 31, 40, 0.16)',
    raised: '0 1px 3px rgba(25, 31, 40, 0.12)',
    accent: '0 6px 16px rgba(11, 122, 69, 0.28)',
    toast: '0 8px 24px rgba(25, 31, 40, 0.18)',
  },

  /** 모바일 플레이어 뒤 막 — 아래 화면이 아무리 밝아도 흰 글자가 4.5:1을 넘는 농도 */
  scrim: 'rgba(10, 13, 17, 0.62)',

  error: '#C62A39',

  // 로딩 중 칠 위로 지나가는 빛
  gradients: {
    shimmer:
      'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%)',
  },

  // PC 카드의 CD 장식 색(vinyl)은 11/27 CD를 빼며 지웠다 — 모바일 플레이어의 회전 CD는 자기 스타일(커버 이미지)을 쓴다

  scrollbar: {
    thumb: 'rgba(25, 31, 40, 0.2)',
    thumbHover: 'rgba(25, 31, 40, 0.3)',
  },
};
