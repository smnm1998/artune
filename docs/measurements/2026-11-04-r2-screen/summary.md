# LLM 직접 선곡 프로브 — 2026-11-04-r2-screen

- 해석 완료 866곡 (고유 곡 기준), 해석 미완료 곡은 해석률 분모에서 제외

## 변형·모델별

| 변형·모델 | 감정 명확·애매 | 문맥 함정 | 지연 p50/p90 | 토큰 입력/출력 | 판정 진행 | 해석률 | 해석률 korea/pop/jpop | 모드 10곡 채움 | 오류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V0 gpt-6-luna | 92% (33/36) | h1→anger, h2→sadness, h3→lonely, h4→joy | 6.9s / 7.9s | 695 / 515 | 100% (960/960) | 93% (895/960) | 91% (510/561) · 96% (307/319) · 98% (78/80) | 96% (77/80) | 0 |
| V1 gpt-6-luna | 89% (32/36) | h1→anger, h2→sadness, h3→lonely, h4→joy | 6.3s / 7.5s | 753 / 519 | 100% (960/960) | 94% (904/960) | 91% (512/561) · 99% (315/319) · 96% (77/80) | 99% (79/80) | 0 |
| V2 gpt-6-luna | 92% (33/36) | h1→sadness, h2→sadness, h3→lonely, h4→joy | 5.7s / 6.5s | 822 / 523 | 100% (960/960) | 95% (910/960) | 92% (512/559) · 99% (317/320) · 100% (81/81) | 99% (79/80) | 0 |
| V3 gpt-6-luna | 94% (34/36) | h1→sadness, h2→sadness, h3→lonely, h4→joy | 6.1s / 6.6s | 930 / 512 | 100% (960/960) | 96% (918/960) | 93% (520/560) · 100% (319/320) · 99% (79/80) | 100% (80/80) | 0 |
| V4 gpt-6-luna | 94% (34/36) | h1→sadness, h2→sadness, h3→lonely, h4→joy | 6.5s / 8.0s | 1048 / 666 | 100% (960/960) | 95% (909/960) | 92% (515/561) · 99% (315/319) · 99% (79/80) | 99% (79/80) | 0 |

## 지시 준수

| 변형·모델 | 모드당 곡 수(목표 12) | 지역 7/4/1 정확 | 아티스트 중복 모드 | 버전·연도 표기 곡 |
| --- | --- | --- | --- | --- |
| V0 gpt-6-luna | 12.0 | 99% (79/80) | 0 | 3 |
| V1 gpt-6-luna | 12.0 | 99% (79/80) | 0 | 5 |
| V2 gpt-6-luna | 12.0 | 99% (79/80) | 4 | 5 |
| V3 gpt-6-luna | 12.0 | 100% (80/80) | 3 | 5 |
| V4 gpt-6-luna | 12.0 | 99% (79/80) | 0 | 2 |

## 기본곡 쏠림·감정별 차별화

- 상위 20곡 비율 · 고유 곡 수는 응답 수가 같을 때만 비교한다 (변형마다 같은 입력)

| 변형·모델 | 완화 상위 20곡 · 고유 | 심취 상위 20곡 · 고유 | 완화 중 회피 목록 곡 | 감정 간 완화 Jaccard | 곡 전 출력(문자 p50) |
| --- | --- | --- | --- | --- | --- |
| V0 gpt-6-luna | 55% · 150곡 | 28% · 266곡 | 25% (121/480) | 0.124 | 133 |
| V1 gpt-6-luna | 47% · 155곡 | 29% · 248곡 | 24% (116/480) | 0.098 | 133 |
| V2 gpt-6-luna | 51% · 141곡 | 26% · 269곡 | 26% (124/480) | 0.119 | 132 |
| V3 gpt-6-luna | 39% · 193곡 | 25% · 266곡 | 1% (4/480) | 0.067 | 135 |
| V4 gpt-6-luna | 37% · 200곡 | 26% · 279곡 | 1% (6/480) | 0.063 | 319 |

## 해석 실패 곡 (264건, 앞 40건) — 환각인지 표기 문제인지 확인용

| 모델 | 지역 | 아티스트 | 곡 |
| --- | --- | --- | --- |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | 김동률 | 가족 |
| V0 gpt-6-luna | korea | 악동뮤지션 | 시간과 낙엽 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | pop | Lana Del Rey |  hope is a dangerous thing for a woman like me to have - but I have it |
| V0 gpt-6-luna | korea | 에픽하이 | Lesson 3 (MC) |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | pop | Bon Iver | Holocene |
| V0 gpt-6-luna | pop | Alanis Morissette | You Oughta Know |
| V0 gpt-6-luna | korea | 백예린 | 우주를 건너 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | pop | Lana Del Rey | hope is a dangerous thing for a woman like me to have - but I have it |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | AKMU | 다리 꼬지 마 |
| V0 gpt-6-luna | korea | 백예린 | Bye bye my blue |
| V0 gpt-6-luna | pop | Bon Iver | Holocene |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | pop | Labrinth | Mount Everest |
| V0 gpt-6-luna | korea | NCT 127 | 영웅 |
| V0 gpt-6-luna | korea | ATEEZ | 미친 폼 |
| V0 gpt-6-luna | korea | 싸이 | 강남스타일 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | jpop | RADWIMPS | なんでもないや |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | 윤하 | 오늘 헤어졌어요 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | korea | 십센치 | 아메리카노 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | korea | 악동뮤지션 | 어떻게 이별까지 사랑하겠어, 널 사랑하는 거지 |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | 윤도현 | 오 필승 코리아 |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V0 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V0 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
