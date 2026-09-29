# Artune

감정 텍스트를 입력하면 어울리는 음악을 추천해주는 서비스

## 모노레포 구조

- TurboRepo 기반 모노레포
- `apps/frontend` - React + Vite (현재 작업 중심)
- `apps/backend` - API 서버

## 절대 하지 말 것

- `.env`: 원본 파일에는 **절대** 접근 안할 것
- `.env.*`: example까지는 허용

## 공통 규칙

- 커밋 메시지: `feat:`, `fix:`, `refactor:` 등 conventional commits 형식
- 코드 작성은 사용자가 직접 함. 클로드는 설명, 초안 작성, 코드 작성 기능 제공 역할

## 블로그 포스팅 (매일)

개발 기록을 매일 한 편씩 페어 블로깅 방식으로 작성한다. `/blog`로 세션 시작.
글쓰기 세션이 아니라 **코드를 다시 읽고 · 설명해보고 · 고치는** 세션이고, 포스트는 그 기록이다.

- 진행 지침: [.claude/blog-guide.md](.claude/blog-guide.md) — **논지는 사용자, 산문은 클로드.** 사용자가 주장+뼈대를 확정한 뒤에만 클로드가 초안을 쓴다
- 소재 백로그: [.claude/blog-topics.md](.claude/blog-topics.md)
- 결과물: `docs/blog/YYYY-MM-DD-slug.md`
- 세션 중 코드 수정이 나오면 그날 커밋·머지하고 그 이유까지 포스팅한다

## 리팩토링 로드맵

Spotify API 2026 정책 변경(Developer Mode 유저 5명 제한, Premium 구독 강제)으로 인해 **iTunes Search API 완전 이전** 결정.

### 전환 순서:

1. **백엔드 iTunes 이전**
   - `spotify.service.js` → iTunes 기반으로 교체
   - `emotion.service.js` SpotifyService 의존성 제거
   - OpenAI 프롬프트에서 `valence/energy/tempo` 제거, 감정 키워드만 반환하도록 단순화
   - `spotify-web-api-node` 패키지 제거

2. **API 호출 최적화**
   - 아티스트 30개 × top tracks 순차 호출 → iTunes 검색 쿼리 1~2회로 대체
   - immerse/soothe `Promise.all` 병렬 처리 복구
   - 동일 감정 키워드 반복 요청 캐싱 (NestJS `CacheModule`)

3. **백엔드 TypeScript 전환**
   - NestJS TS 전환으로 데코레이터 이슈 해결
   - DTO 타입 정의로 프론트-백 응답 계약 명확화

4. **프론트엔드 TypeScript 전환** (진행 중 → `apps/frontend/CLAUDE.md` 참고)

5. **정리**
   - 불필요한 주석/JSDoc 제거
   - 테스트 코드 업데이트 (Spotify mock → iTunes mock)
