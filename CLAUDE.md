# Artune

감정 텍스트를 입력하면 어울리는 음악을 추천해주는 서비스

## 모노레포 구조

- TurboRepo 기반 모노레포
- `apps/frontend` - React 19 + Vite
- `apps/backend` - NestJS 11 API 서버
- `packages/shared-types` - 프론트·백 공유 응답 타입

## 절대 하지 말 것

- `.env`: 원본 파일에는 **절대** 접근 안할 것
- `.env.*`: example까지는 허용

## 공통 규칙

- 커밋 메시지: `feat:`, `fix:`, `refactor:` 등 conventional commits 형식
- 코드 작성은 사용자가 직접 함. 클로드는 설명, 초안 작성, 코드 작성 기능 제공 역할

## 블로그 포스팅 (매일)

개발 기록을 매일 한 편씩 페어 블로깅 방식으로 작성한다. `/blog`로 세션 시작.
글쓰기 세션이 아니라 **코드를 다시 읽고 · 설명해보고 · 고치는** 세션이고, 포스트는 그 기록이다.

- 진행 지침: [.claude/topics/blog/blog-guide.md](.claude/topics/blog/blog-guide.md) — **논지는 사용자, 산문은 클로드.** 사용자가 주장+뼈대를 확정한 뒤에만 클로드가 초안을 쓴다
- 소재 백로그: [.claude/topics/blog/blog-topics.md](.claude/topics/blog/blog-topics.md)
- 결과물: `docs/blog/YYYY-MM-DD-slug.md`
- 세션 중 코드 수정이 나오면 그날 커밋·머지하고 그 이유까지 포스팅한다

## 지금 구조 (11월)

- 글 → OpenAI가 감정 분류 + 직접 선곡(Structured Outputs, 스트림) → 곡이 하나 완성될 때마다 iTunes에서 해석 → POST 스트림(SSE 형식)으로 곡마다 전송 → 프론트는 첫 곡에서 결과 화면으로
- 흐름도와 응답 시간 수치는 README, 측정 조건과 하네스는 `docs/measurements/eval/README.md`
- 지나온 구조: 5월 아티스트 기반(Spotify → iTunes 이전, TS 전환) → 7월 Last.fm 유사곡 하이브리드 → 11월 AI 직접 선곡 · 곡 단위 스트리밍

## 지금 단계

- 11/11부터 코드 리팩토링(주석 · 코드 개연성 · 필요성 점검)과 요청 흐름을 따라 로직별 공부
- 진행 상황과 다음 할 일은 로컬 메모 `.claude/now.md`(git 무시, 지도는 `.claude/README.md`)
