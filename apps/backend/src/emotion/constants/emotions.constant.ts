/**
 * 감정 분류 — LLM 응답 스키마의 enum과 화면 라벨·설명 문구의 키
 *
 * 라벨을 LLM이 따로 생성하던 때는 설명 문구의 키(불안·평온·사랑)와 어긋나
 * 두려움·놀람·중립이 기본 문구로 나갔다 (11/4 확인). 키를 enum으로 통일한다.
 */
export const EMOTIONS = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'surprise',
  'neutral',
  'sentimental',
  'excited',
  'lonely',
  'dreamy',
  'confident',
  'romance',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_LABELS: Record<Emotion, string> = {
  joy: '기쁨',
  sadness: '슬픔',
  anger: '분노',
  fear: '두려움',
  surprise: '놀람',
  neutral: '중립',
  sentimental: '아련함',
  excited: '신남',
  lonely: '고독',
  dreamy: '몽환',
  confident: '자신감',
  romance: '설렘',
};
