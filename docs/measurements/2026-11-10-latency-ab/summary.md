# 응답 시간 — 2026-11-10-latency-ab

- 실행: 2026-11-10T07:05:44.844Z ~ 2026-11-10T07:56:06.343Z · 커밋 6fe8e99 · Node v22.23.4
- 입력 12개 (docs/measurements/eval/inputs.json, sha1 e10a06bf1544, 시드 20261110로 섞음) · 요청 사이 120초 · 서버는 실행마다 새로 띄움(캐시 빈 상태에서 시작)
- 서버: `baseline`(sse, 얼린 빌드 35513b4) · `current`(stream, 지금 빌드) · 입력마다 서버 순서를 번갈아 (짝수 번째 입력은 지정 순서, 홀수 번째는 반대)
- 첫 곡 = 클라이언트가 곡이 담긴 첫 이벤트(응답)를 받은 시점. stream은 첫 track 이벤트, sse·post는 곡이 완료 시점에 한꺼번에 와서 첫 곡 = 전체. 머리말 = stream의 meta 이벤트(감정·공감 문구·아트워크)
- 합격 기준(p50): 첫 곡 ≤ 2.5s · 전체 ≤ 8s

## 서버별

| 서버 | 성공 | 첫 곡 p50 | 첫 곡 p90 | 전체 p50 | 전체 p90 | 머리말 p50 | OpenAI p50 | iTunes 호출 p50 (최대) | 차단 난 요청 | 곡 채움 | 합격 (첫 곡 · 전체) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `baseline` sse | 12/12 | 12.19s | 14.20s | 12.19s | 14.20s | — | 7.56s | 27 (40) | 0 | 100% | ❌ · ❌ |
| `current` stream | 12/12 | 3.18s | 4.57s | 8.88s | 10.53s | 2.48s | 7.78s | 29.5 (56) | 0 | 100% | ❌ · ❌ |

## 같은 입력끼리 비교 (기준 − 비교 대상, 양수면 비교 대상이 빠름)

| 기준 | 비교 대상 | 짝 수 | 첫 곡 차이 p50 | 전체 차이 p50 | 첫 곡이 더 빠른 입력 |
| --- | --- | --- | --- | --- | --- |
| `baseline` | `current` | 12 | 8.61s | 3.23s | 12/12 |

## 요청별

| # | 입력 | 서버 | 첫 곡 | 전체 | OpenAI | iTunes (차단) | 곡 심취/완화 | 감정 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dreamy-ambig | baseline | 13.22s | 13.22s | 7.97s | 35 (0) | 10/10 | 몽환 |  |
| 1 | dreamy-ambig | current | 4.33s | 10.59s | 7.29s | 41 (0) | 10/10 | 몽환 |  |
| 2 | confident-clear | current | 5.20s | 8.97s | 8.27s | 40 (0) | 10/10 | 신남 |  |
| 2 | confident-clear | baseline | 13.95s | 13.95s | 8.76s | 40 (0) | 10/10 | 신남 |  |
| 3 | sadness-ambig | baseline | 10.38s | 10.38s | 6.78s | 33 (0) | 10/10 | 슬픔 |  |
| 3 | sadness-ambig | current | 2.59s | 7.51s | 7.21s | 29 (0) | 10/10 | 슬픔 |  |
| 4 | fear-ambig | current | 3.11s | 8.06s | 7.77s | 24 (0) | 10/10 | 두려움 |  |
| 4 | fear-ambig | baseline | 11.45s | 11.45s | 8.55s | 25 (0) | 10/10 | 두려움 |  |
| 5 | romance-ambig | baseline | 14.23s | 14.23s | 6.91s | 27 (0) | 10/10 | 설렘 |  |
| 5 | romance-ambig | current | 3.25s | 9.10s | 7.97s | 29 (0) | 10/10 | 설렘 |  |
| 6 | sentimental-clear | current | 3.89s | 8.54s | 7.79s | 36 (0) | 10/10 | 아련함 |  |
| 6 | sentimental-clear | baseline | 10.62s | 10.62s | 7.03s | 27 (0) | 10/10 | 아련함 |  |
| 7 | joy-clear | baseline | 10.67s | 10.67s | 6.90s | 34 (0) | 10/10 | 신남 |  |
| 7 | joy-clear | current | 4.60s | 10.03s | 8.06s | 34 (0) | 10/10 | 신남 |  |
| 8 | lonely-clear | current | 2.61s | 8.79s | 7.81s | 25 (0) | 10/10 | 고독 |  |
| 8 | lonely-clear | baseline | 12.96s | 12.96s | 7.99s | 13 (0) | 10/10 | 고독 |  |
| 9 | anger-clear | baseline | 14.28s | 14.28s | 8.07s | 30 (0) | 10/10 | 분노 |  |
| 9 | anger-clear | current | 3.11s | 10.96s | 6.81s | 56 (0) | 10/10 | 분노 |  |
| 10 | excited-ambig | current | 3.92s | 9.24s | 7.79s | 25 (0) | 10/10 | 신남 |  |
| 10 | excited-ambig | baseline | 12.38s | 12.38s | 7.87s | 20 (0) | 10/10 | 신남 |  |
| 11 | surprise-clear | baseline | 12.00s | 12.00s | 7.26s | 22 (0) | 10/10 | 놀람 |  |
| 11 | surprise-clear | current | 2.78s | 7.86s | 6.95s | 30 (0) | 10/10 | 놀람 |  |
| 12 | neutral-ambig | current | 2.54s | 8.57s | 7.10s | 25 (0) | 10/10 | 슬픔 |  |
| 12 | neutral-ambig | baseline | 9.35s | 9.35s | 6.00s | 16 (0) | 10/10 | 슬픔 |  |
