# 응답 시간 — 2026-11-11-r5

- 실행: 2026-11-11T04:11:50.138Z ~ 2026-11-11T05:18:03.032Z · 커밋 ed3ebaf · Node v22.23.4
- 입력 26개 (docs/measurements/eval/inputs.json, sha1 e10a06bf1544, 시드 20261110로 섞음) · 요청 사이 120초 · 서버는 실행마다 새로 띄움(캐시 빈 상태에서 시작)
- 서버: `current`(stream, 지금 빌드)
- 첫 곡 = 클라이언트가 곡이 담긴 첫 이벤트(응답)를 받은 시점. stream은 첫 track 이벤트, sse·post는 곡이 완료 시점에 한꺼번에 와서 첫 곡 = 전체. 머리말 = stream의 meta 이벤트(감정·공감 문구·아트워크)
- 합격 기준(p50): 첫 곡 ≤ 2.5s · 전체 ≤ 8s
- 반복: 본 실행 뒤 6개(romance-clear, anger-clear, sadness-clear, lonely-clear, joy-clear, neutral-clear)를 한 번 더 — 같은 서버의 첫 화면 곡 키를 seen으로 보냄. 서버별 표는 본 실행만

## 서버별

| 서버 | 성공 | 첫 곡 p50 | 첫 곡 p90 | 전체 p50 | 전체 p90 | 머리말 p50 | OpenAI p50 | iTunes 호출 p50 (최대) | 차단 난 요청 | 곡 채움 | 합격 (첫 곡 · 전체) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `current` stream | 26/26 | 2.72s | 4.00s | 7.39s | 9.27s | 2.05s | 6.36s | 26 (44) | 0 | 100% | ❌ · ✅ |

## 감정 · 화면 곡 (본 실행)

| 서버 | 감정 명확 | 감정 애매 | 문맥 함정 | 감정 전체 | 심취 곡 평균 / 최소 | 완화 곡 평균 / 최소 | 10곡 채운 모드 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `current` stream | 83% (10/12) | 100% (12/12) | 100% (2/2) | 92% (24/26) | 10.0 / 10곡 | 10.0 / 10곡 | 52/52 |

- 감정이 틀린 입력: confident-clear@current → excited (정답 confident) · joy-clear@current → excited (정답 joy)

## 같은 글 다시 + 이력 (반복 실행)

- 두 번째 화면 곡 중 첫 화면에서 본 곡 수(분모 = 두 번째 화면 곡 수). 판단(eval README "R5 최종 비교"): 심취 평균 3곡 이상이면 심취 15곡 안을 응답 시간과 함께 다시 잰다

| 서버 | 입력 | 심취 다시 본 곡 | 완화 다시 본 곡 | 보낸 이력 심취/완화 |
| --- | --- | --- | --- | --- |
| `current` | romance-clear | 0/10 | 0/10 | 10/10 |
| `current` | anger-clear | 0/10 | 0/10 | 10/10 |
| `current` | sadness-clear | 1/10 | 0/10 | 10/10 |
| `current` | lonely-clear | 0/10 | 0/10 | 10/10 |
| `current` | joy-clear | 3/10 | 0/10 | 10/10 |
| `current` | neutral-clear | 1/10 | 0/10 | 10/10 |
| `current` | **평균** | **0.8** | **0.0** |  |

## 요청별

| # | 입력 | 서버 | 첫 곡 | 전체 | OpenAI | iTunes (차단) | 곡 심취/완화 | 감정 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | romance-clear | current | 4.23s | 7.85s | 7.26s | 38 (0) | 10/10 | 설렘 |  |
| 2 | neutral-ambig | current | 3.68s | 8.00s | 6.67s | 36 (0) | 10/10 | 슬픔 |  |
| 3 | sentimental-ambig | current | 2.28s | 7.02s | 6.35s | 35 (0) | 10/10 | 아련함 |  |
| 4 | context-resigned | current | 2.56s | 7.74s | 7.38s | 22 (0) | 10/10 | 슬픔 |  |
| 5 | romance-ambig | current | 4.39s | 10.29s | 7.67s | 29 (0) | 10/10 | 설렘 |  |
| 6 | lonely-ambig | current | 2.72s | 8.16s | 6.78s | 33 (0) | 10/10 | 고독 |  |
| 7 | dreamy-ambig | current | 3.49s | 8.28s | 6.93s | 32 (0) | 10/10 | 몽환 |  |
| 8 | context-sarcasm | current | 2.36s | 7.73s | 6.26s | 31 (0) | 10/10 | 슬픔 |  |
| 9 | confident-clear | current | 1.87s | 5.89s | 5.52s | 38 (0) | 10/10 | 신남 |  |
| 10 | excited-ambig | current | 2.14s | 6.56s | 6.11s | 25 (0) | 10/10 | 신남 |  |
| 11 | anger-clear | current | 5.34s | 13.57s | 6.56s | 44 (0) | 10/10 | 분노 |  |
| 12 | surprise-ambig | current | 3.77s | 8.51s | 6.04s | 31 (0) | 10/10 | 기쁨 |  |
| 13 | excited-clear | current | 3.42s | 6.61s | 6.05s | 28 (0) | 10/10 | 신남 |  |
| 14 | anger-ambig | current | 3.40s | 7.07s | 6.41s | 29 (0) | 10/10 | 분노 |  |
| 15 | surprise-clear | current | 3.41s | 6.71s | 6.37s | 26 (0) | 10/10 | 놀람 |  |
| 16 | sadness-clear | current | 2.72s | 6.57s | 6.26s | 17 (0) | 10/10 | 슬픔 |  |
| 17 | confident-ambig | current | 2.55s | 5.95s | 5.13s | 22 (0) | 10/10 | 자신감 |  |
| 18 | lonely-clear | current | 2.72s | 10.04s | 6.04s | 26 (0) | 10/10 | 고독 |  |
| 19 | joy-clear | current | 1.92s | 5.94s | 5.50s | 12 (0) | 10/10 | 신남 |  |
| 20 | sadness-ambig | current | 2.51s | 6.79s | 6.04s | 19 (0) | 10/10 | 슬픔 |  |
| 21 | joy-ambig | current | 2.44s | 7.67s | 6.89s | 14 (0) | 10/10 | 기쁨 |  |
| 22 | fear-ambig | current | 2.49s | 7.08s | 6.05s | 22 (0) | 10/10 | 두려움 |  |
| 23 | fear-clear | current | 3.61s | 7.54s | 6.63s | 20 (0) | 10/10 | 두려움 |  |
| 24 | dreamy-clear | current | 2.95s | 8.17s | 7.05s | 23 (0) | 10/10 | 몽환 |  |
| 25 | neutral-clear | current | 3.04s | 7.23s | 6.75s | 18 (0) | 10/10 | 중립 |  |
| 26 | sentimental-clear | current | 2.63s | 6.42s | 6.12s | 21 (0) | 10/10 | 아련함 |  |
| 27 | romance-clear | current | 3.64s | 6.77s | 6.31s | 20 (0) | 10/10 | 설렘 | 반복(이력 보냄) |
| 28 | anger-clear | current | 2.50s | 6.67s | 5.86s | 31 (0) | 10/10 | 분노 | 반복(이력 보냄) |
| 29 | sadness-clear | current | 3.36s | 7.69s | 6.99s | 19 (0) | 10/10 | 슬픔 | 반복(이력 보냄) |
| 30 | lonely-clear | current | 3.67s | 8.25s | 7.27s | 17 (0) | 10/10 | 고독 | 반복(이력 보냄) |
| 31 | joy-clear | current | 2.30s | 6.03s | 5.67s | 13 (0) | 10/10 | 신남 | 반복(이력 보냄) |
| 32 | neutral-clear | current | 3.33s | 7.90s | 6.99s | 18 (0) | 10/10 | 중립 | 반복(이력 보냄) |
