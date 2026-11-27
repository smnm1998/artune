/**
 * 화면 폭 기준 — CSS(미디어 쿼리)와 JS(useMediaQuery)가 같은 값을 쓴다
 * (11/27 한 벌로: CSS용 size.ts 1440·1024·480은 지웠다)
 * - mobile 768 이하: 로고 가운데 · 입력창 안 버튼 + 글자 수 테두리
 * - compact 1024 이하: 결과를 한 뷰씩(감정 결과 ↔ 추천곡), 누르면 플레이어 모달
 */
export const BREAKPOINTS = {
  mobile: 768,
  compact: 1024,
} as const;

/** useMediaQuery에 넘기는 조건 */
export const QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
  compact: `(max-width: ${BREAKPOINTS.compact}px)`,
} as const;

/** Emotion css 안에서 쓰는 미디어 쿼리 — `${MEDIA.compact} { ... }` */
export const MEDIA = {
  mobile: `@media ${QUERIES.mobile}`,
  compact: `@media ${QUERIES.compact}`,
} as const;
