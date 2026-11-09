/**
 * 화면 고지 문구 — 생성형 AI 고지(AI 기본법 31조)와 Apple 표기(iTunes Search API 약관 · Apple Music 가이드라인)
 * 표기 규칙: "Apple Music"·"iTunes"는 영문 그대로, Apple Music을 "앱"이라 부르지 않는다
 */
export const NOTICES = {
  /** 입력 화면 맨 아래 — 쓰기 전에 생성형 AI 서비스임을 알린다(사전 고지) */
  AI_BEFORE_USE:
    '입력한 글은 생성형 AI(OpenAI)가 읽고 감정을 분석해 곡을 골라요.',
  /** 결과 화면 맨 아래 — 결과물이 생성형 AI의 것임을 표시한다 */
  AI_RESULT:
    '감정 분석·공감 문구·곡 추천은 생성형 AI(OpenAI)의 결과이고, 아트워크는 생성형 AI(Gemini)로 만든 이미지예요.',
  /** 미리듣기 바로 옆 — iTunes Search API 약관 */
  PREVIEW_ATTRIBUTION: 'provided courtesy of iTunes',
  /** 결과 화면 맨 아래 — 사이트에 한 번만 (Apple Music 가이드라인) */
  TRADEMARK:
    'Apple, Apple Music and iTunes are trademarks of Apple Inc., registered in the U.S. and other countries.',
} as const;
