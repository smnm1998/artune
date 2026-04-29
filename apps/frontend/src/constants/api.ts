// API 기본 URL - 환경 변수에서 가져오거나 기본값 사용
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// API 엔드포인트
export const API_ENDPOINTS = {
  ANALYZE_EMOTION: '/api/emotion/analyze',
  ANALYZE_EMOTION_STREAM: '/api/emotion/analyze-stream',
};

// HTTP 요청 타임아웃
export const REQUEST_TIMEOUT = 30000;
