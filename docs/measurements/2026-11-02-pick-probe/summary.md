# LLM 직접 선곡 프로브 — 2026-11-02-pick-probe

- 해석 완료 547곡 (고유 곡 기준), 해석 미완료 곡은 해석률 분모에서 제외

## 모델별

| 모델 | 감정 명확·애매 | 문맥 함정 | 지연 p50/p90 | 토큰 입력/출력 | 판정 진행 | 해석률 | 해석률 korea/pop/jpop | 모드 10곡 채움 | 오류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-4.1-mini | 96% (23/24) | sarcasm→lonely, resigned→sentimental | 4.9s / 5.5s | 515 / 435 | 100% (623/623) | 70% (434/623) | 48% (176/365) · 100% (206/206) · 100% (52/52) | 23% (12/52) | 0 |
| gpt-6-luna | 92% (22/24) | sarcasm→sadness, resigned→sadness | 6.2s / 6.5s | 512 / 448 | 100% (624/624) | 69% (428/624) | 47% (170/364) · 100% (208/208) · 96% (50/52) | 17% (9/52) | 0 |
| gpt-6.1-terra | 96% (23/24) | sarcasm→lonely, resigned→sadness | 8.2s / 8.7s | 512 / 454 | 100% (624/624) | 64% (402/624) | 39% (142/364) · 100% (208/208) · 100% (52/52) | 13% (7/52) | 0 |

## 지시 준수

| 모델 | 모드당 곡 수(목표 12) | 지역 7/4/1 정확 | 아티스트 중복 모드 | 버전·연도 표기 곡 |
| --- | --- | --- | --- | --- |
| gpt-4.1-mini | 12.0 | 96% (50/52) | 2 | 15 |
| gpt-6-luna | 12.0 | 100% (52/52) | 0 | 2 |
| gpt-6.1-terra | 12.0 | 100% (52/52) | 0 | 0 |

## 해석 실패 곡 (607건, 앞 40건) — 환각인지 표기 문제인지 확인용

| 모델 | 지역 | 아티스트 | 곡 |
| --- | --- | --- | --- |
| gpt-4.1-mini | korea | 아이유 | 좋은 날 |
| gpt-4.1-mini | korea | 볼빨간사춘기 | 우주를 줄게 |
| gpt-4.1-mini | korea | 레드벨벳 | 빨간 맛 |
| gpt-4.1-mini | korea | 싸이 | 강남스타일 |
| gpt-4.1-mini | korea | 혁오 | 와리가리 |
| gpt-4.1-mini | korea | 어반자카파 | 그리워라 |
| gpt-4.1-mini | korea | 헤이즈 | 비도 오고 그래서 |
| gpt-4.1-mini | korea | 벤 | 180도 |
| gpt-4.1-mini | korea | 악동뮤지션 | 시간과 낙엽 |
| gpt-4.1-mini | korea | 폴킴 | 비 |
| gpt-4.1-mini | korea | 적재 | 나랑 같이 걸을래 |
| gpt-4.1-mini | korea | 로이킴 | 그때 헤어지면 돼 |
| gpt-4.1-mini | korea | 헤이즈 | 널 너무 모르고 |
| gpt-4.1-mini | korea | 볼빨간사춘기 | 우주를 줄게 |
| gpt-4.1-mini | korea | 어반자카파 | 그날에 우리 |
| gpt-4.1-mini | korea | 백예린 | 그건 아마 우리의 잘못은 아닐 거야 |
| gpt-4.1-mini | korea | 폴킴 | 모든 날, 모든 순간 |
| gpt-4.1-mini | korea | 헤이즈 | 비도 오고 그래서 |
| gpt-4.1-mini | korea | 정승환 | 이 바보야 |
| gpt-4.1-mini | korea | 어반자카파 | 그날에 우리 |
| gpt-4.1-mini | korea | 볼빨간사춘기 | 우주를 줄게 |
| gpt-4.1-mini | korea | 크러쉬 | 가끔 |
| gpt-4.1-mini | korea | 헤이즈 | 널 너무 모르고 |
| gpt-4.1-mini | korea | 먼데이 키즈 | 너무 보고 싶어 |
| gpt-4.1-mini | korea | 허각 | 나를 잊지 말아요 |
| gpt-4.1-mini | korea | 자이언티 | 꺼내 먹어요 |
| gpt-4.1-mini | korea | 지코 | 아무노래 |
| gpt-4.1-mini | korea | 크러쉬 | 가끔 |
| gpt-4.1-mini | korea | 비투비 | 너 없인 안 된다 |
| gpt-4.1-mini | korea | 볼빨간사춘기 | 나만, 봄 |
| gpt-4.1-mini | korea | 헤이즈 | 비도 오고 그래서 |
| gpt-4.1-mini | korea | 어반자카파 | 그날에 우리 |
| gpt-4.1-mini | korea | 샘김 | 향수 |
| gpt-4.1-mini | korea | 수란 | 오늘 취하면 |
| gpt-4.1-mini | korea | 자이언티 | 꺼내 먹어요 |
| gpt-4.1-mini | korea | 크러쉬 | 가끔 |
| gpt-4.1-mini | korea | 아이유 | 팔레트 |
| gpt-4.1-mini | korea | 자이언티 | 꺼내 먹어요 |
| gpt-4.1-mini | korea | 폴킴 | 모든 날, 모든 순간 |
| gpt-4.1-mini | korea | 헤이즈 | 비도 오고 그래서 |
