# Frontend

## Stack

- React 19, Vite 7 (SWC), TypeScript, Emotion (CSS-in-JS), Zustand, framer-motion
- 테스트: Vitest + Testing Library

## 경로 alias

`@/` -> `src/` (vite.config + tsconfig paths 동일하게 유지)

## Emotion 관련

`jsxImportSource: '@emotion/react'` - tsconfig와 vite.config 양쪽에 선언 필요
