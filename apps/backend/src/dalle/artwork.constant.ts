import type { Emotion } from '../emotion/constants/emotions.constant';

/** 감정별 아트워크 — 프론트 public/artwork/ 의 정적 이미지 (Gemini로 미리 만든 디저트 픽셀 아트) */
export const ARTWORK_URLS: Record<Emotion, string> = {
  joy: '/artwork/joy.png',
  sadness: '/artwork/sadness.png',
  anger: '/artwork/anger.png',
  fear: '/artwork/fear.png',
  surprise: '/artwork/surprise.png',
  neutral: '/artwork/neutral.png',
  sentimental: '/artwork/sentimental.png',
  excited: '/artwork/excited.png',
  lonely: '/artwork/lonely.png',
  dreamy: '/artwork/dreamy.png',
  confident: '/artwork/confident.png',
  romance: '/artwork/romance.png',
};
