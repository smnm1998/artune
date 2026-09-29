# Frontend

## Stack

- React 19, Vite 7 (SWC), Emotion (CSS-in-JS), Zustand, framer-motion
- 테스트: Vitest + Testing Library

## 현재 진행 중: JS -> TS 마이그레이션

### 전환 순서:

1. `tsconfig.json` 생성 + `vite.config.js` → `.ts`
2. `src/constants/` — 상수 파일부터 시작
3. `src/utils/`
4. `src/api/` — client, emotionApi
5. `src/hooks/`
6. `src/stores/`
7. `src/components/` — styles 먼저, 그다음 JSX
8. `src/App`, `src/main`

## 경로 alias

`@/` -> `src/` (vite.config + tsconfig paths 동일하게 유지)

## Emotion 관련

`jsxImportSource: '@emotion/react'` - tsconfig와 vite.ocnfig 양쪽에 선언 필요
