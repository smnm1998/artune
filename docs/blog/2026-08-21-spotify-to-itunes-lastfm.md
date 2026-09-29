# 대안은 준비돼 있지 않았다, 이미 돌고 있었다

> ★ 한 줄 요약: `> [직접 작성]` — 이 글의 결론 한 문장

---

## 1. 소개

Artune은 감정을 문장으로 입력하면 어울리는 음악을 추천해주는 사이드 프로젝트다. "오늘 좀 지쳤다" 같은 문장을 넣으면 LLM이 감정을 해석하고, 그 감정에 맞는 곡 목록과 디저트 이미지를 돌려준다. 비영리고, 혼자 만들고 있다.

이 프로젝트는 음악 추천 엔진을 지금까지 네 번 다시 만들었다. 그 첫 번째 전환 — Spotify에서 iTunes Search API로 갈아탄 이야기를 쓴다. 코드를 옮긴 이야기가 아니라, **옮길 수 있었던 이유가 내가 잘 설계해둬서가 아니었다**는 걸 뒤늦게 확인한 이야기다.

오늘 이 글을 쓰기 위해 4개월 전 커밋을 다시 열어봤고, 거기서 내가 기억하던 것과 다른 사실을 하나 발견했다. 그게 이 글의 중심이다.

> ★ **처음엔 뭐라고 생각했나 / 왜 틀렸나**
> `> [직접 작성]` — Spotify를 걷어낼 때 "iTunes 하나로 충분하다"고 판단했던 근거는 뭐였고, 그게 왜 틀렸나.

---

## 2. Spotify의 유료 전환

Spotify는 2026년 2월 Web API의 Developer Mode 규칙을 바꿨다. ([Spotify 공식 마이그레이션 가이드](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide), [TechCrunch, 2026-02-06](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)) 새 Development Mode 앱은 2026-02-11부터, 기존 앱은 2026-03-09부터 적용됐다.

프로젝트 문서([CLAUDE.md](../../CLAUDE.md))에 당시 남긴 판단은 이렇게 적혀 있다.

> Spotify API 2026 정책 변경(Developer Mode 유저 5명 제한, Premium 구독 강제)으로 인해 **iTunes Search API 완전 이전** 결정.

핵심은 두 가지였다. Developer Mode 앱은 사용자를 5명까지만 둘 수 있고(2021년 도입 때는 25명), 그 이상은 확장 쿼터 심사를 받아야 한다. 그리고 앱 소유자(개발자)가 Premium을 구독하고 있어야 앱이 동작한다. 구독이 끊기면 앱도 멈춘다. 게다가 Artune이 요청마다 60번씩 부르던 `GET /artists/{id}/top-tracks`는 Development Mode에서 아예 제거됐다. 비영리로 돌리는 개인 프로젝트에게 이건 "기능이 하나 줄었다"가 아니라 **"서비스가 성립하지 않는다"**였다. 심사를 통과할 자신도, 무료 서비스를 위해 Premium 구독을 계속 유지할 명분도 없었다.

여기서 중요한 건 내가 뭘 잘못 구현해서 죽은 게 아니라는 점이다. 코드는 그대로였고, 테스트도 그대로 통과했다. 바깥에서 규칙이 바뀌었을 뿐이다.

---

## 3. 기존에 쓰던 API를 승격시켰다

### 3.1 Spotify를 어떻게 쓰고 있었나

당시 [`spotify.service.ts`](https://github.com/smnm1998/artune/blob/4de8597%5E/apps/backend/src/spotify/spotify.service.ts)는 346줄짜리 파일 하나였고, 공개 메서드는 다섯 개였다.

```ts
async authenticate()                       // Client Credentials 인증
async searchArtistsByGenre(genre, limit)   // 장르로 아티스트 검색
async getArtistTopTracks(artistId)         // 아티스트별 인기곡
async getAudioFeatures(trackIds)           // valence / energy / tempo
async getRecommendations(genres, valence, energy, tempo)
```

한 번의 추천 요청이 만드는 외부 호출은 **인증 1회 + 장르 검색 4회 + top tracks 60회 = 65회**였다. (출처: [itunes-refactor-notes.md §6](../itunes-refactor-notes.md) — 호출 구조 기준 집계)

특히 `getAudioFeatures`가 중요했다. Spotify는 곡마다 valence(긍정도), energy, tempo를 숫자로 준다. "슬픔에 심취하는 곡"과 "슬픔을 완화하는 곡"을 나누는 기준이 **곡 단위 수치**로 존재했다는 뜻이다.

### 3.2 그런데 iTunes는 이미 코드 안에 있었다

이 글을 쓰면서 옛 커밋을 다시 열었다가 확인한 사실이다. Spotify 시절의 `spotify.service.ts`는 이미 `ITunesService`를 주입받고 있었다.

```ts
// spotify.service.ts (4de8597 이전)
const itunesPreviewMap =
  await this.itunesService.getPreviewUrlsBatch(trackList);

// preview_url을 iTunes URL로 교체
const tracksWithItunes = diverseTracks.map((item) => { ... });
```

Spotify가 주는 30초 미리듣기 URL이 국가·계약에 따라 비어 있는 경우가 많아서, 미리듣기만 iTunes 것으로 채워 쓰고 있었다. 즉 전환을 시작한 시점에 iTunes는 **검토 대상 후보가 아니라 이미 프로덕션에서 돌고 있는 코드**였다.

### 3.3 전환 실제 기록

전환 커밋은 2026-05-06 하루에 몰려 있다.

| 커밋 | 내용 |
|---|---|
| `f3c2057`~`6073784` | 프론트·백엔드 TypeScript 전환 (4커밋) |
| `f81dac9` | `spotify-web-api-node` 패키지 제거 |
| `0f463ec` | OpenAI 프롬프트에서 valence/energy/tempo 제거, iTunes keywords 추가 |
| `4de8597` | spotify 모듈 → music 모듈 교체 |
| `d48447c` | 아티스트 기반 추천으로 전환 + iTunes rate limit 처리 |

교체 커밋 `4de8597`의 규모는 **13파일, +133 / −504**다. 346줄짜리 `spotify.service.ts`가 통째로 지워지고, 그 자리에 `music.service.ts` 14줄과 `itunes.service.ts` +44줄이 들어왔다. 소비하는 쪽 변경은 이게 전부였다.

```ts
// emotion.service.ts
- private readonly spotifyService: SpotifyService,
+ private readonly musicService: MusicService,

- this.spotifyService.getRecommendations(
-   emotion.immerse.genres, valence, energy, tempo,
- )
+ this.musicService.getRecommendations(
+   emotion.immerse.genres, emotion.immerse.keywords,
+ )
```

`track-filter.util.ts`는 **경로만 옮겨졌고 내용은 0줄 바뀌었다.** 프로바이더에 안 묶인 로직은 그대로 살아남았다는 뜻이다.

정리하면 전환 비용은 확실히 쌌다. 하루, `−504`줄, 소비처 한 곳. 하지만 그게 싼 이유는 내가 프로바이더 교체를 대비해서 인터페이스를 뽑아놨기 때문이 **아니다.** 지금 코드를 다시 봐도 프로바이더 추상화는 없다. `MusicService`는 `ITunesService`와 `LastfmService`를 구체 클래스로 그냥 주입받는다.

```ts
// music.service.ts — 인터페이스도 토큰도 없다
constructor(
  private readonly itunesService: ITunesService,
  private readonly lastfmService: LastfmService,
) {}
```

쌌던 진짜 이유는 두 개다. **하나, 대안이 이미 같은 코드베이스에서 돌고 있었다. 둘, 외부 API를 부르는 지점이 원래 한 곳뿐이었다.**

그리고 이 전환이 완전하지 않았다는 흔적도 남아 있다. 오늘 기준으로 `spotify`라는 문자열이 코드에 3곳 남아 있는데, 전부 응답 필드 이름이다.

```ts
// packages/shared-types/src/index.ts
export interface Track {
  // ...
  external_urls: { spotify: string };  // ← 값은 iTunes trackViewUrl
}
```

떠난 지 4개월 된 프로바이더의 이름이 프론트-백 API 계약에 아직 박혀 있다.

---

## 4. iTunes 단독의 한계

전환 자체는 하루 만에 끝났지만, "추천이 제대로 되는가"는 그때부터 문제였다.

### 4.1 곡 단위 신호가 통째로 사라졌다

Spotify의 valence/energy/tempo가 없어지면서, 곡 하나하나를 무드로 판단할 근거가 0이 됐다. 대체물은 마련하지 않았다. 남은 건 LLM이 골라준 아티스트 이름뿐이었고, iTunes `artistTerm` 검색은 **그 아티스트의 인기곡**을 돌려줄 뿐이다.

RADWIMPS를 "격한 감정"에 넣으면 「너의 이름은」 발라드가 나온다. 아티스트 선택은 맞는데 곡에서 무드가 유실된다.

당시 프롬프트에는 이 한계를 스스로 자백한 문장까지 들어 있었다.

> "차분한 곡도 있는 신나는 가수를 soothe에 넣으면 결과는 신나는 곡"

한계를 알면서 프롬프트로 때우려 한 흔적이다. 그리고 더 심한 건, 프롬프트가 모드별 `genres`를 만들고 있었는데 **그 값이 음악 추천에는 한 번도 안 쓰이고 있었다**는 점이다. 소비처는 DALL·E 이미지 프롬프트뿐이었다. immerse/soothe 구분이 100% LLM의 아티스트 선정에만 걸려 있었다. (근거: [itunes-refactor-notes.md §4](../itunes-refactor-notes.md))

### 4.2 두 번 메워봤다

**첫 번째,** iTunes 응답의 `primaryGenreName`을 꺼내 모드별 장르와 대조하는 소프트 필터를 넣었다. 매칭된 곡을 앞으로 당길 뿐 **제거하지는 않는** 방식이라 최악의 경우에도 기존과 동일하게 동작한다. 평균 매칭률 20% → 66%. (SSE 6모드 실측, 2026-07-21)

**두 번째,** "기쁨·슬픔은 완화 추천이 모호하다"는 체감을 지표로 만들었다. immerse 20곡과 soothe 20곡의 장르 라벨 분포가 얼마나 겹치는지를 재는 `mode-separation`이다. 분노 0% vs 기쁨 30% / 슬픔 70%로, 체감과 정확히 일치했다. 장르 배치를 고쳐 기쁨 20% / 슬픔 35%까지 내렸다. (2026-07-21 실측)

### 4.3 그래도 남은 것

두 조치 모두 **아티스트 단위 판단을 장르 라벨로 보정**하는 것이었지, 곡 단위 신호를 되살린 건 아니었다. 무드 판단은 여전히 아티스트에서 끝나고 아티스트→곡 단계에서 유실됐다.

> `> [확인 필요]` 뼈대에 적으신 **"겹치는 곡들의 향연"**과 **"아티스트가 아닌 플레이리스트 위주의 추천"** 두 가지는 측정 기록이 없어 비워둡니다.
> 구체적으로 무슨 현상이었는지(같은 곡이 반복됐다 / 특정 아티스트가 계속 나왔다 등) 알려주시면 이 자리에 넣겠습니다. 기록이 없으면 "기억으로는 이랬다"로 밝히고 쓰는 방법도 있습니다.

---

## 5. 해결 방안 모색 — Last.fm

### 5.1 먼저 틀린 길로 갔다

곡 단위 신호가 없는 게 문제라면, **LLM에게 곡을 직접 고르게 하면** 되지 않을까. 감정당 30곡을 아티스트-곡명 쌍으로 뱉게 하고 iTunes로는 해석만 시키는 방향을 구현해서 실측했다. (2026-07-22)

무드는 확실히 개선됐다. RADWIMPS에서 발라드 대신 격한 곡이 나왔다. 그런데 나머지가 무너졌다.

| 항목 | 결과 |
|---|---|
| 응답 시간 | **21초** (곡 60개 JSON 생성, OpenAI 단독 16초) |
| 수율 | 20곡 목표에 **6~13곡** 출렁 |
| iTunes 해석률 | **20~43%** (6~13/30, 프로토타입에서는 83%였음) |

원인은 프롬프트가 아니라 능력의 종류였다. LLM은 유사도를 계산하는 게 아니라 **기억으로 곡 제목을 뱉는다.** 그래서 딥컷을 지어내고, 지어낸 곡은 iTunes에 없어서 해석이 실패한다. 그리고 iTunes는 카탈로그지 추천 엔진이 아니다. 결국 **한 컴포넌트에 두 종류의 지능을 요구하고 있었다.**

이 시도에서 만든 곡명 대조 검증(`titleMatches`)과 `resolveTrack`은 버리지 않고 다음 구조에 그대로 재사용했다.

### 5.2 Last.fm을 고른 이유

필요한 건 "이 곡을 좋아한 사람이 같이 들은 곡"이었다. 그건 LLM의 기억이 아니라 **청취 데이터로 만든 협업 필터링**의 영역이다. Last.fm `track.getSimilar`가 정확히 그걸 준다.

선택 기준은 세 가지였다. **무료(비상업 용도), OAuth 같은 사용자 인증 불필요(API 키만), 그리고 접근성** — 가입해서 키 하나 받으면 끝이고, 사용자에게 로그인을 요구하지 않는다. Spotify에서 죽은 이유가 정확히 "사용자 인증과 구독"이었기 때문에, 이번엔 그 축을 아예 안 건드리는 걸 조건으로 뒀다.

곧바로 손으로 확인한 결과가 설득력 있었다. (2026-07-22)

- System Of A Down "Toxicity" → Chop Suey! / Slipknot / Korn — 무드가 일관되게 유지된다
- 시드의 지역성이 유사곡에 전파된다: IU → 전부 K-Pop, YOASOBI → J-Pop, Dua Lipa → 전부 팝
- 다만 마이너한 시드는 유사곡이 **0개**로 온다 (BewhY "Forever" → 0)

두 번째 관측이 결정적이었다. 시드 지역이 전파된다면, 한국 곡을 시드로 넣으면 한국 곡이 확장돼 나온다는 뜻이다. 지역 비율을 코드에서 직접 통제할 수 있게 된다.

### 5.3 최종 구조

각 컴포넌트에게 **잘하는 일 하나씩만** 시키는 구조로 정리했다.

```
LLM        감정 해석 → 지역별 시드곡  { korea×3, pop×2, jpop×1 }
  ↓
Last.fm    track.getSimilar          → 협업 필터링 유사곡 (match 점수)
  ↓
iTunes     resolveTrack              → 실제 재생 가능한 실물 + 미리듣기 URL
  ↓
지역 쿼터   selectByRegionQuota      → 한국6 : 팝3 : 일본1, 모드당 10곡
```

감정 해석은 LLM, 음악 유사도는 협업 필터링, 재생 가능한 실물은 iTunes. 5.1에서 실패한 이유가 "한 컴포넌트에 두 지능을 요구한 것"이었으니, 그걸 그대로 뒤집은 셈이다.

구현은 커밋 5개로 쪼갰다: `a5a3fb0`(곡명 대조 유틸) → `162c4de`(지역 쿼터 유틸) → `99342c3`(Last.fm 서비스) → `11a4149`(iTunes 해석 API) → `11f506a`(파이프라인 통합).

실패 처리에서 하나 배운 게 있다. Last.fm은 **HTTP 200 안에 `error` 필드를 담아** 실패를 알려준다. 상태 코드만 보면 성공으로 읽힌다.

```ts
// lastfm.service.ts
if (response.data?.error) {
  this.logger.warn(`[lastfm] ${method} error ${response.data.error}`);
  return null;
}
```

그리고 이 구조에서 `MusicService`가 Last.fm에 요구하는 계약은 딱 하나다. `(artist, title) → { artist, title, match }[]`. 호출 지점도 [music.service.ts:141](../../apps/backend/src/music/music.service.ts#L141) 한 줄뿐이다. 3.3에서 확인한 "외부 API 호출면이 한 곳"이라는 성질이 여기서도 유지됐다.

### 5.4 남은 병목은 Last.fm이 아니었다

구조를 바꾸고 나니 진짜 병목이 드러났다. iTunes의 rate limit(체감 ~20회/분)이다. 후보를 CAP만큼 전부 해석해놓고 실제로는 10곡만 쓰고 있었다 — 24곡 해석해서 10곡 쓰는 낭비가 iTunes를 스스로 스로틀시키고, 그 여파로 **다음 요청의 수율이 무너졌다.**

여기서 오진을 한 번 했다. 처음엔 "분노·중립 감정이 구조적으로 해석 안 된다"고 판단했다. 그런데 서버를 새로 띄우고 첫 요청을 보내니 분노도 심취 10곡·완화 8곡이 정상으로 나왔다. **범인은 감정도 곡명 대조 로직도 아니고 누적 throttle이었다.** 재측정을 안 하고 `titleMatches`를 손댔으면 멀쩡한 걸 망칠 뻔했다.

수정은 match 순으로 3개씩 해석하다 지역별 목표치가 차면 멈추는 조기 종료였다 (`e142db7`).

| 항목 | before | after |
|---|---|---|
| 수율 immerse | 4.8 / 10 | **7.8 / 10** |
| 수율 soothe | 5.3 / 10 | **8.3 / 10** |
| 응답 시간 | 11.0s | **9.4s** |

> ⚠️ 측정 조건: 2026-08-14 로컬, 동일 4개 감정을 12초 간격으로 연타하는 스트레스 조건. 콜드 단발 요청이 아니다.
> 목표는 모드당 10곡이라, 이건 목표 달성이 아니라 개선이다. 원본 로그: [measurements/2026-08-14-early-stop.log](../measurements/2026-08-14-early-stop.log)

---

## 6. 마무리

네 번의 추천 엔진 중 첫 번째 전환을 다시 읽고 정리한 것은 이렇다.

**서비스는 코드가 틀려서 죽지 않는다.** Spotify가 정책을 바꿨을 때 내 코드는 아무 문제가 없었다. 테스트도 통과했다. 그런데 서비스는 성립하지 않게 됐다. 외부 API 의존은 기능 하나가 흔들리는 문제가 아니라 서비스 존속의 문제다.

**그런데 이 프로젝트가 하루 만에 살아난 이유는 내가 그걸 대비해서가 아니었다.** 프로바이더 인터페이스도, 어댑터 계층도, 대안 API 검토 문서도 없었다. 커밋에도 문서에도 그런 흔적이 하나도 없다. 살아난 이유는 두 가지였다 — 미리듣기 URL을 채우려고 iTunes를 이미 병행해서 쓰고 있었고, 외부 API를 부르는 지점이 원래 한 곳뿐이었다. 앞의 것은 운이었고, 뒤의 것만 설계였다.

**그리고 지금도 대비돼 있지 않다.** Last.fm은 호출면이 한 줄이라 갈아타기 싸지만, iTunes는 다르다. `ITunesTrack` 타입이 `music/utils` 6개 파일에 퍼져 있고, 프론트-백 공유 DTO의 필드 이름까지 파고들어 있다. 오늘 `external_urls.spotify`가 남아 있는 것이 그 증거다 — 이미 한 번 갈아탄 프로바이더의 이름조차 아직 못 걷어냈다.

> ★ **느낀 점 / 남은 한계**
> `> [직접 작성]`
> - 지금 이 구조가 틀리게 되는 조건은 무엇인가 (Last.fm이 유료로 전환되면? iTunes가 rate limit을 더 조이면?)
> - 비영리 개인 프로젝트에서 "대안 B, C를 준비한다"는 게 현실적으로 어디까지인가
> - 아직 못 고친 것

---

### 참고

- 전환 커밋: `f81dac9` · `0f463ec` · `4de8597` · `d48447c` (2026-05-06)
- Last.fm 도입 커밋: `a5a3fb0` · `162c4de` · `99342c3` · `11a4149` · `11f506a` (2026-07-25)
- 측정 기록: [docs/itunes-refactor-notes.md](../itunes-refactor-notes.md)
