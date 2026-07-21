# iTunes 전환 성능 측정 기록 및 리팩토링 근거 (2026-07-21)

이력서 수치화를 위해 신/구 호출 패턴을 실측하다가 발견한 결함과 결정 사항 기록.

## 1. 결론 요약

- **Spotify ↔ iTunes 전후 응답시간 비교는 불가능** — Spotify Client Credentials가 정책 변경으로 실행 불가. 이력서에는 시간 단축이 아니라 **호출 구조 개선(요청당 Spotify 호출 65회 제거)** 으로만 서술한다.
- 현재 iTunes 구현에는 rate limit 상황에서 악화되는 결함이 있다 → **측정보다 수정이 먼저.**
- 수치화는 "Spotify 대비"가 아니라 **"수정 전 iTunes vs 수정 후 iTunes"** 로 잡는다. 양쪽 다 실행 가능하므로 정직한 before/after가 나온다.

## 2. 측정 시도와 무효 판정 사유

벤치마크 하네스로 구(4de8597^ preview 채우기)·신(현행 getTracksForArtists) 패턴을 재현 실측.

| 시도 | 결함 | 교훈 |
|---|---|---|
| v1 | OLD이 매회 동일 20쌍 재조회 → Apple 엣지 캐시 히트(p50 308ms→19ms). 항상 OLD→NEW 순서라 OLD이 만든 throttle을 NEW가 뒤집어씀(429 33/44콜) | 입력 통제 + 실행 순서 교대 필수 |
| v2 | seed 단계 자체가 throttle에 걸려 iteration 2·3에서 2쌍/1쌍만 확보 → OLD arm이 사실상 빈 실행 | 쿨다운을 넉넉히 잡아도 iTunes throttle 창이 김 |
| 공통 | OLD 측정에 Spotify 순차 62콜(지배 비용)이 아예 빠짐 | 전후 비교 자체가 성립 안 함 |

**단, 무효 벤치마크에서도 유효한 관측:**
- NEW cold, throttle 상황: **60콜 / throttle 100% / 결과 트랙 0개** ← 수정 후 비교용 before 값
- NEW warm(전원 캐시 히트): 네트워크 0콜인데 wall 1.81s (배치 딜레이 6×300ms 무조건 실행)

## 3. 발견된 결함 (수정 대상)

### 결함 1 — 3개국 폴백이 throttle을 증폭 (심각)
`itunes.service.ts` `fetchByArtist`의 `catch { return [] }`가 상태코드를 삼켜서
**429/403(일시적 차단)과 "결과 없음"이 구분되지 않는다.**
throttle 상태에서 빈 배열 → 다음 국가 폴백 → 또 429 → 3개국 소진.
아티스트 20명 기준 20콜이 60콜로 3배 증폭되고, 그 증폭이 throttle을 더 악화시키는 양의 피드백.

### 결함 2 — throttle 결과가 6시간 캐시에 오염 (정합성 버그)
`getArtistTopTracks`가 3개국 실패 후 빈 배열을 캐시.
일시적 429 한 번에 해당 아티스트가 **6시간 동안 추천에서 무증상 실종.**

### 결함 3 — 캐시 히트율 구조적 상한 ~25%
시뮬레이션(20,000회) 결과 25.5%. OpenAI 프롬프트가 "절반 이상 다른 아티스트",
"인디 12명은 매 호출마다 거의 새로운 풀"을 강제 → 풀 재등장률 ~50% × 선택 20/40 = 상한 25%.
프롬프트의 다양성 요구와 캐시 전략이 서로 싸우는 구조. (당장 수정 아님, 인지만)

### 부수 관측 — warm 경로 고정 1.8초
캐시 히트 여부와 무관하게 배치 간 300ms 딜레이 무조건 실행.
단, 히트율 25% 대입 시 "전원 히트 배치만 skip" 최적화의 기대 절감은 ~30ms → **수정 가치 없음.**

## 4. 완화/심취 분위기 한계의 근본 원인

- 프롬프트가 모드별 `genres`를 생성하지만 **음악 추천에 전혀 사용되지 않는다.**
  소비처는 `emotion.service.ts`의 DALL·E 이미지 프롬프트뿐.
  `MusicService.getRecommendations(artists)`는 아티스트 이름만 받음.
- 즉 immerse/soothe 구분이 100% LLM의 아티스트 선정에 의존. 트랙 레벨 신호 0.
  (Spotify 시절의 valence/energy 트랙 필터가 사라진 채 대체물 없음 — 프롬프트 스스로
  "차분한 곡도 있는 신나는 가수를 soothe에 넣으면 결과는 신나는 곡" 이라고 한계 자백)
- 해결 방향: iTunes 응답의 `primaryGenreName` 활용(2026-07-21 실측 확인).
  현재 `ITunesTrack` 타입에 선언조차 없음. `limit` 상향 + 모드 genres 대조 필터.
- **주의:** iTunes 장르 라벨은 거침 — Nick Drake "Northern Sky"가 `Rock`.
  엄격 매칭 금지, 장르 패밀리 매핑 + 소프트 필터(매칭 우선, 부족분은 비매칭으로 보충)로 설계.

## 5. 작업 순서

1. 결함 1·2 수정 — 상태코드 판별, throttle 시 국가 폴백 중단 + 빈 결과 캐시 금지
2. 장르 필터 도입 — `primaryGenreName` + 모드 genres 전달 (`getRecommendations(artists, genres)`)
3. 측정 — 수정 전/후 iTunes 구현 비교: throttle 상황 실패율·수율·호출 수, 정상 상황 지연시간
4. (별건) jest `testRegex`가 `.spec.ts$`라 `.js` spec 5개(31개 테스트)가 미실행 — TS 이전 필요

## 6. 이력서에 지금 시점에 쓸 수 있는 검증된 수치

- 추천 요청당 외부 API 호출: Spotify 65회(인증1+장르검색4+top tracks 60) 전부 제거
- 순차 HTTP 왕복 60회 → 동시성 3 배치 7회
- immerse/soothe/DALL·E 3-way `Promise.all` 병렬화
- spotify.service.ts 346줄 → music 40 + itunes 137 + utils 68줄 분해 (해당 커밋 순 -371줄)
- TS 전환: 소스 82파일 중 72개(88%), Babel 툴체인 제거
- ~~응답시간 X% 단축~~ ← 금지. 측정 근거 없음

## 7. 테스트 정비 결과 (2026-07-21 완료)

- 죽은 테스트 정리: `.spec.js` 6개(존재하지 않는 SpotifyService/삭제된 메서드/주석 처리된 API 테스트) → 현재 API 기준 재작성
- **4 suites / 22 tests → 8 suites / 56 tests** (실행되는 테스트 +155%)
  (AppModule에서 이미 제외돼 있던 데드 코드 AppController/AppService와 그 spec은 삭제)
- 커버리지(전체 소스 기준): stmts 71.5% / lines 72.3%
  - 서비스 레이어: 6개 서비스 중 5개 statement 100% (openai 83%)
  - 0%인 곳: main.ts·*.module.ts(부트스트랩/DI 선언 — e2e 영역), **emotion.controller.ts(실질 갭)**
- strictNullChecks 활성화: 런타임에만 드러나던 결함 3건을 컴파일 타임으로 이동
  (누락된 return TS2366 1건 — 실제 런타임 크래시로 발현했던 버그, 미검증 환경변수 TS2322 2건 → getOrThrow로 fail-fast 전환)
- 남은 갭: emotion.controller 테스트(SSE 포함), openai.service 69% branch, e2e, 프론트 vitest

## 8. 응답시간 실측·최적화 결과 (2026-07-21 완료)

계측: emotion.service 단계별 타이밍 로그(`[timing]`) 영구 추가. 로컬 실측, 요청 간 60s 간격.

| 단계 | SSE total | openai | iTunes 구간 | 수율 |
|---|---|---|---|---|
| baseline (순차) | **17.9s** (3회 평균) | 9.3s (52%) | 8.6s 순차 | 20/20 |
| ① SSE 병렬화 후 | ~13.8s | 9.4s | **4.5s** (병렬) | 20/20 |
| ② 아티스트 40→25명 후 | **11.6s** (3회 평균) | **7.5s** | 4.1s | 20/20 |

**최종: 17.9s → 11.6s (-35%).** 변동폭도 ±0.9s → ±0.4s로 축소.

### 구현 노트
- ① 병렬화: 과거 곡 오차 커밋(20d0539)은 옛 `getPreviewUrlsBatch`의 무제한 동시 요청 문제
  — 현 구조(아티스트 단위, 동시성 3)와 무관함을 확인 후 재도입.
  진행률은 "완료 카운트 → 마일스톤(60/80/95)" 매핑으로 단조 증가 보장
  (프론트 useAppStore의 Math.max 가드와 이중 안전망). 클라이언트에서 SSE 스트림 단조성 실측 검증.
- ② 축소: 분포 규칙 8/8/4/12/8 → 5/5/3/7/5, validateResult 최소 30→20명.
  openai 9.4→7.5s (-20%). 예상(-3s)보다 작은 이유: 출력에 description/keywords/genres 고정분 +
  API 왕복 고정 오버헤드 존재.
- 추가 여지(미실행): OpenAI를 감정분석(소형) + 모드별 아티스트(병렬 2회)로 분리 시 ~9.5s 예상.
  복잡도 증가 대비 이득 판단 필요.

### 이력서 문장 (검증 완료)
"단계별 타이밍 계측으로 병목 식별(LLM 52%, 외부 API 순차 호출 48%) 후
SSE 진행률 단조성을 보장하는 병렬화와 LLM 출력 축소로 응답시간 17.9초 → 11.6초(-35%) 단축,
추천 수율 20/20 유지"
