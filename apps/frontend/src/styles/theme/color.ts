export const colors = {
  // text
  text: {
    primary: '#f9f9f9', // 메인 텍스트
    secondary: '#b0b0b0', // 보조 텍스트
    tertiary: 'rgba(249, 249, 249, 0.7)', // 3차 텍스트
    placeholder: 'rgba(249, 249, 249, 0.5)', // placeholder
    disabled: 'rgba(249, 249, 249, 0.3)', // 비활성화
  },

  // background
  background: {
    // 메인 배경
    gradient: 'linear-gradient(135deg, #000f00 0%, #0d0d0d 100%',
    white: '#ffffff',
    primaryWhite: '#f9f9f9',

    // 글래스모피즘 (투명도 적용한 테마)
    glass: {
      subtle: 'rgba(255,255,255,0.05)', // 미세하게
      light: 'rgba(255,255,255,0.1)', // 기본값
      medium: 'rgba(255, 255, 255, 0.15)', // 호버
      mediumHeavy: 'rgba(255,255,255,0.2)',
      heavy: 'rgba(255,255,255,0.3)',
    },

    // 다크 배경
    dark: {
      primary: 'rgba(20, 20, 20, 0.95)',
      subtle: 'rgba(40, 40, 50, 0.9)',
    },
  },

  // border
  border: {
    light: 'rgba(255, 255, 255, 0.1)', // 기본 테두리
    medium: 'rgba(255, 255, 255, 0.18)', // 강조 테두리
    strong: 'rgba(255, 255, 255, 0.2)', // 더 진한 테두리
    hover: 'rgba(255, 255, 255, 0.3)', // 호버시

    // 특수 테두리
    vinyl: 'rgba(255, 255, 255, 0.5)', // CD 디스크
    vinylCenter: 'rgba(200, 200, 200, 0.6)', // CD 중앙홀
  },

  // shadow
  shadow: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.4)',
    strong: 'rgba(0, 0, 0, 0.5)',
    subtle: 'rgba(0, 0, 0, 0.2)',

    // 특수 그림자
    inset: 'rgba(255, 255, 255, 0.05)', // 내부 하이라이트
    colored: 'rgba(69, 234, 69, 0.2)', // 컬러 그림자
  },

  // 강조
  accent: {
    // 메인 액센트
    primary: {
      base: 'rgba(69, 234, 69, 0.3)',
      border: 'rgba(69, 234, 69, 0.4)',
    },

    // 초록 계열 (아이콘 등)
    green: '#2d5f2d',
  },

  // 그라데이션
  gradients: {
    // CD 홀로그램 효과 (무지개 반사)
    hologram:
      'conic-gradient(from 45deg, #e0e0e0, #ffd4ff, #d4f4ff, #fff4d4, #ffd4d4, #d4ffe4, #e0e0e0)',
    // CD 중앙 홀 그라데이션
    vinylCenter:
      'radial-gradient(circle, rgba(40, 40, 40, 0.9) 0%, rgba(80, 80, 80, 0.7) 40%, rgba(140, 140, 140, 0.5) 100%)',

    // CD 디스크 반사광
    vinylReflection:
      'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(200, 200, 200, 0.5) 50%, rgba(150, 150, 150, 0.7) 100%)',

    // 로딩 shimmer 효과
    shimmer:
      'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%)',
  },

  // 스크롤 바
  scrollbar: {
    thumb: 'rgba(255, 255, 255, 0.2)',
    thumbHover: 'rgba(255, 255, 255, 0.3)',
  },

  // Error
  error: {
    color: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
    textColor: '#ffffff',
  },
};
