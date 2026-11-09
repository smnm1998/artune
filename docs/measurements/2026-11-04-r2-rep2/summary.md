# LLM 직접 선곡 프로브 — 2026-11-04-r2-rep2

- 해석 완료 1070곡 (고유 곡 기준), 해석 미완료 곡은 해석률 분모에서 제외

## 변형·모델별

| 변형·모델 | 감정 명확·애매 | 문맥 함정 | 지연 p50/p90 | 토큰 입력/출력 | 판정 진행 | 해석률 | 해석률 korea/pop/jpop | 모드 10곡 채움 | 오류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V3 gpt-6-luna | 94% (34/36) | h1→sadness, h2→sadness, h3→lonely, h4→joy | 7.9s / 18.1s | 930 / 512 | 100% (962/962) | 95% (916/962) | 93% (518/560) · 99% (318/322) · 100% (80/80) | 100% (80/80) | 0 |
| V4 gpt-6-luna | 94% (34/36) | h1→anger, h2→sadness, h3→lonely, h4→joy | 8.3s / 11.4s | 1048 / 745 | 100% (960/960) | 96% (919/960) | 94% (524/560) · 99% (317/320) · 98% (78/80) | 96% (77/80) | 0 |

## 지시 준수

| 변형·모델 | 모드당 곡 수(목표 12) | 지역 7/4/1 정확 | 아티스트 중복 모드 | 버전·연도 표기 곡 |
| --- | --- | --- | --- | --- |
| V3 gpt-6-luna | 12.0 | 98% (78/80) | 2 | 3 |
| V4 gpt-6-luna | 12.0 | 100% (80/80) | 0 | 4 |

## 기본곡 쏠림·감정별 차별화

- 상위 20곡 비율 · 고유 곡 수는 응답 수가 같을 때만 비교한다 (변형마다 같은 입력)

| 변형·모델 | 완화 상위 20곡 · 고유 | 심취 상위 20곡 · 고유 | 완화 중 회피 목록 곡 | 감정 간 완화 Jaccard | 곡 전 출력(문자 p50) |
| --- | --- | --- | --- | --- | --- |
| V3 gpt-6-luna | 37% · 199곡 | 24% · 287곡 | 1% (7/481) | 0.063 | 130 |
| V4 gpt-6-luna | 43% · 178곡 | 23% · 300곡 | 0% (2/480) | 0.083 | 312 |

## 해석 실패 곡 (87건, 앞 40건) — 환각인지 표기 문제인지 확인용

| 모델 | 지역 | 아티스트 | 곡 |
| --- | --- | --- | --- |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | TWICE | Celebrate |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | 자이언티 | 양화대교 |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | korea | 백예린 | Bye bye my blue |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | pop | Green Day | American Idiot |
| V3 gpt-6-luna | korea | 백예린 | Bye bye my blue |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | pop | Green Day | American Idiot |
| V3 gpt-6-luna | korea | 샤이니 | View |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | ITZY | 달라달라 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | pop | Bon Iver | Holocene |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | korea | 샘김 | Make Up |
| V3 gpt-6-luna | korea | 샘김 | Who Are You |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| V3 gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| V3 gpt-6-luna | korea | AKMU | 다이노소어 |
| V3 gpt-6-luna | korea | 장범준 | 꽃송이가 |
| V3 gpt-6-luna | korea | 자이언티 | 눈 |
| V3 gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
