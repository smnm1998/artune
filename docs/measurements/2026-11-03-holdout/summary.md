# LLM 직접 선곡 프로브 — 2026-11-03-holdout

- 해석 완료 564곡 (고유 곡 기준), 해석 미완료 곡은 해석률 분모에서 제외

## 모델별

| 모델 | 감정 명확·애매 | 문맥 함정 | 지연 p50/p90 | 토큰 입력/출력 | 판정 진행 | 해석률 | 해석률 korea/pop/jpop | 모드 10곡 채움 | 오류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-luna | 94% (34/36) | h1→anger, h2→sadness, h3→lonely, h4→joy | 4.0s / 4.5s | 511 / 457 | 100% (960/960) | 95% (909/960) | 93% (520/560) · 97% (311/320) · 98% (78/80) | 98% (78/80) | 0 |
| gpt-4.1-mini | 97% (35/36) | h1→surprise, h2→sadness, h3→confident, h4→joy | 3.7s / 4.2s | 514 / 432 | 100% (957/957) | 92% (876/957) | 87% (488/560) · 98% (312/317) · 95% (76/80) | 89% (71/80) | 0 |

## 지시 준수

| 모델 | 모드당 곡 수(목표 12) | 지역 7/4/1 정확 | 아티스트 중복 모드 | 버전·연도 표기 곡 |
| --- | --- | --- | --- | --- |
| gpt-6-luna | 12.0 | 100% (80/80) | 0 | 5 |
| gpt-4.1-mini | 12.0 | 96% (77/80) | 3 | 27 |

## 해석 실패 곡 (132건, 앞 40건) — 환각인지 표기 문제인지 확인용

| 모델 | 지역 | 아티스트 | 곡 |
| --- | --- | --- | --- |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | 윤하 | 기다리다 |
| gpt-6-luna | korea | 우울한 편지 | 유재하 |
| gpt-6-luna | korea | 윤하 | 기다리다 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | pop | Green Day | American Idiot |
| gpt-6-luna | pop | Green Day | American Idiot |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | ITZY | 달라달라 |
| gpt-6-luna | pop | The Black Eyed Peas | I Gotta Feeling |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | 이상은 | 담다디 |
| gpt-6-luna | korea | 이상은 | 담다디 |
| gpt-6-luna | jpop | 松任谷由実 | やさしさに包まれたなら |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | 악동뮤지션 | 오랜 날 오랜 밤 |
| gpt-6-luna | pop | Bon Iver | Holocene |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | 윤하 | 기다리다 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | ITZY | 달라달라 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | pop | The Black Eyed Peas | I Gotta Feeling |
| gpt-6-luna | pop | Israel Kamakawiwoʻole | Somewhere Over the Rainbow |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | 윤하 | 기다리다 |
| gpt-6-luna | korea | 십센치 | 폰서트 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | pop | Bon Iver | Holocene |
| gpt-6-luna | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
| gpt-6-luna | korea | DAY6 | 한 페이지가 될 수 있게 |
