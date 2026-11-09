# 해석기 v2 홀드아웃 — 블라인드 수동 검수 (100곡)

튜닝에 쓰지 않은 곡 중 v2가 **채택한** 곡에서 무작위 100곡(고정 시드). 모델·자동 판정은 숨겼다.
검수: 2026-11-03, 사람이 YouTube로 곡마다 확인(외부 LLM 판정은 보지 않음). 집계는 `analysis.md` 3절.
각 줄 끝 `판정:` 뒤에 하나를 적는다.

- **O** 요청한 곡의 원곡(같은 가수의 그 곡. 리마스터·다른 앨범 수록은 O)
- **V** 같은 곡이지만 다른 버전(라이브·리믹스·어쿠스틱·다른 언어 버전 등)
- **X** 다른 곡이거나 다른 가수(커버·MR·동명이곡)
- **?** 판단 못 함

표기: 결과는 KR 스토어 표기(없으면 US), 괄호 안은 US 표기. 링크로 들어보면 확실하다.

1. 요청 **ウルフルズ — ガッツだぜ!!** → 결과 **Gattsu Daze!! V — Ulfuls** · 앨범 Zu Ban · [듣기](https://music.apple.com/kr/album/gattsu-daze-v/1613108145?i=1613108146&uo=4) · 판정: O
2. 요청 **아이유 — 잔소리** → 결과 **잔소리 (with 슬옹) [feat. 슬옹] — 아이유** (US: Nitpicking (with Lim Seul Ong) [feat. Lim Seul Ong] — IU) · 앨범 잔소리 - Single · [듣기](https://music.apple.com/kr/album/%EC%9E%94%EC%86%8C%EB%A6%AC-with-%EC%8A%AC%EC%98%B9-feat-%EC%8A%AC%EC%98%B9/378048652?i=378048655&uo=4) · 판정: O
3. 요청 **Ben Rector — Old Friends** → 결과 **Old Friends — Ben Rector** · 앨범 Magic · [듣기](https://music.apple.com/kr/album/old-friends/1585841144?i=1585841148&uo=4) · 판정: O
4. 요청 **Keane — Somewhere Only We Know** → 결과 **Somewhere Only We Know — Keane** · 앨범 Somewhere Only We Know - EP · [듣기](https://music.apple.com/us/album/somewhere-only-we-know/1445286850?i=1445287036&uo=4) · 판정: O
5. 요청 **마마무 — 나로 말할 것 같으면** → 결과 **나로 말할 것 같으면 — 마마무** (US: Yes I Am — MAMAMOO) · 앨범 Purple - EP · [듣기](https://music.apple.com/kr/album/%EB%82%98%EB%A1%9C-%EB%A7%90%ED%95%A0-%EA%B2%83-%EA%B0%99%EC%9C%BC%EB%A9%B4/1888604291?i=1888604292&uo=4) · 판정: O
6. 요청 **Green Day — Basket Case** → 결과 **Basket Case — Green Day** · 앨범 Dookie · [듣기](https://music.apple.com/kr/album/basket-case/1160081985?i=1160082180&uo=4) · 판정: O
7. 요청 **이승환 — 세상에 뿌려진 사랑만큼** → 결과 **세상에 뿌려진 사랑만큼 — 이승환** (US: As Much as the Love Scattered — Lee Seung Hwan) · 앨범 Always · [듣기](https://music.apple.com/kr/album/%EC%84%B8%EC%83%81%EC%97%90-%EB%BF%8C%EB%A0%A4%EC%A7%84-%EC%82%AC%EB%9E%91%EB%A7%8C%ED%81%BC/890390529?i=890390542&uo=4) · 판정: O
8. 요청 **MAMAMOO — Starry Night** → 결과 **별이 빛나는 밤 — 마마무** (US: Starry Night — MAMAMOO) · 앨범 Yellow Flower · [듣기](https://music.apple.com/kr/album/%EB%B3%84%EC%9D%B4-%EB%B9%9B%EB%82%98%EB%8A%94-%EB%B0%A4/1676209346?i=1676209349&uo=4) · 판정: O
9. 요청 **선우정아 — 봄처녀** → 결과 **봄처녀 — 선우정아** (US: Springirls — sunwoojunga) · 앨범 봄처녀 - Single · [듣기](https://music.apple.com/kr/album/%EB%B4%84%EC%B2%98%EB%85%80/1748018815?i=1748018816&uo=4) · 판정: O
10. 요청 **안예은 — 창귀** → 결과 **창귀 — 안예은** (US: CHANGGWI — Ahn Ye Eun) · 앨범 창귀 - Single · [듣기](https://music.apple.com/kr/album/%EC%B0%BD%EA%B7%80/1578857514?i=1578857515&uo=4) · 판정: O
11. 요청 **김현식 — 내 사랑 내 곁에** → 결과 **내 사랑 내곁에 — 김현식** (US: 내 사랑 내곁에 — Kim Hyun Shik) · 앨범 김현식 Vol.6 · [듣기](https://music.apple.com/kr/album/%EB%82%B4-%EC%82%AC%EB%9E%91-%EB%82%B4%EA%B3%81%EC%97%90/1804632355?i=1804632356&uo=4) · 판정: O
12. 요청 **Billie Eilish — bad guy** → 결과 **bad guy — Billie Eilish** · 앨범 WHEN WE ALL FALL ASLEEP, WHERE DO WE GO? · [듣기](https://music.apple.com/kr/album/bad-guy/1450695723?i=1450695739&uo=4) · 판정: O
13. 요청 **Billy Joel — Piano Man** → 결과 **Piano Man — Billy Joel** · 앨범 The Essential Billy Joel · [듣기](https://music.apple.com/kr/album/piano-man/158815463?i=158815547&uo=4) · 판정: O
14. 요청 **Frank Ocean — Pink + White** → 결과 **Pink + White — Frank Ocean** · 앨범 Blonde · [듣기](https://music.apple.com/kr/album/pink-white/1146195596?i=1146195714&uo=4) · 판정: O
15. 요청 **井上陽水 — 少年時代** → 결과 **少年時代 (Remastered 2018) — 井上陽水** · 앨범 ハンサムボーイ (Remastered 2018) · [듣기](https://music.apple.com/kr/album/%E5%B0%91%E5%B9%B4%E6%99%82%E4%BB%A3-remastered-2018/1430703565?i=1430704363&uo=4) · 판정: O
16. 요청 **SUNMI — Pporappippam** → 결과 **보라빛 밤 — 선미** (US: Pporappippam — SUNMI) · 앨범 보라빛 밤 - Single · [듣기](https://music.apple.com/kr/album/%EB%B3%B4%EB%9D%BC%EB%B9%9B-%EB%B0%A4/1518738614?i=1518738615&uo=4) · 판정: O
17. 요청 **Puer Kim — Manyo Maash** → 결과 **마녀 마쉬 — 퓨어킴** (US: Manyo maash — Puer Kim) · 앨범 Purifier - EP · [듣기](https://music.apple.com/kr/album/%EB%A7%88%EB%85%80-%EB%A7%88%EC%89%AC/1787425833?i=1787425842&uo=4) · 판정: O
18. 요청 **어반자카파 — 그대 고운 내사랑** → 결과 **그대 고운 내사랑 (Sleep Mix) — 어반자카파** (US: Beautiful My Love (Sleep Mix) — Urban Zakapa) · 앨범 그대 고운 내 사랑 (Sleep Mix) - Single · [듣기](https://music.apple.com/kr/album/%EA%B7%B8%EB%8C%80-%EA%B3%A0%EC%9A%B4-%EB%82%B4%EC%82%AC%EB%9E%91-sleep-mix/1661282435?i=1661282436&uo=4) · 판정: V
19. 요청 **DAYBREAK — 좋다** → 결과 **좋다 — 데이브레이크** (US: Fall In Love With You — Daybreak) · 앨범 New Day - EP · [듣기](https://music.apple.com/kr/album/%EC%A2%8B%EB%8B%A4/1411874797?i=1411875057&uo=4) · 판정: O
20. 요청 **Baek Yerin — Maybe It's Not Our Fault** → 결과 **Maybe It’s Not Our Fault — Yerin Baek** · 앨범 Our Love is Great · [듣기](https://music.apple.com/us/album/maybe-its-not-our-fault/1698534871?i=1698534874&uo=4) · 판정: O
21. 요청 **Jung Seung Hwan — The Fool** → 결과 **이 바보야 — 정승환** (US: The Fool — Jung Seung Hwan) · 앨범 목소리 - EP · [듣기](https://music.apple.com/kr/album/%EC%9D%B4-%EB%B0%94%EB%B3%B4%EC%95%BC/1527243074?i=1527243077&uo=4) · 판정: O
22. 요청 **Bruno Mars — Just the Way You Are** → 결과 **Just the Way You Are — Bruno Mars** · 앨범 Doo-Wops & Hooligans · [듣기](https://music.apple.com/us/album/just-the-way-you-are/576654788?i=576655095&uo=4) · 판정: O
23. 요청 **이승환 — 가족** → 결과 **가족 — 이승환** (US: Family — Lee Seung Hwan) · 앨범 Cycle · [듣기](https://music.apple.com/kr/album/%EA%B0%80%EC%A1%B1/890348993?i=890349009&uo=4) · 판정: O
24. 요청 **박효신 — 좋은 사람** → 결과 **좋은 사람 — 박효신** (US: 좋은 사람 — Park Hyo Shin) · 앨범 Park Hyo Shin Best (Voice=2003-1999) · [듣기](https://music.apple.com/kr/album/%EC%A2%8B%EC%9D%80-%EC%82%AC%EB%9E%8C/1804584256?i=1804584564&uo=4) · 판정: O
25. 요청 **Fleetwood Mac — Landslide** → 결과 **Landslide — Fleetwood Mac** · 앨범 Fleetwood Mac · [듣기](https://music.apple.com/us/album/landslide/912323292?i=912323300&uo=4) · 판정: O
26. 요청 **H.O.T. — 빛** → 결과 **빛 — H.O.T.** (US: Hope — H.O.T.) · 앨범 Resurretion - The 3rd Album · [듣기](https://music.apple.com/kr/album/%EB%B9%9B/1060407199?i=1060407446&uo=4) · 판정: O
27. 요청 **오존 — 밤** → 결과 **밤 — 오존** (US: Night — O3ohn) · 앨범 co - EP · [듣기](https://music.apple.com/kr/album/%EB%B0%A4/1567540416?i=1567540421&uo=4) · 판정: O
28. 요청 **DJ DOC — Run to You** → 결과 **Run to You — DJ DOC** · 앨범 The Life... DOC Blues · [듣기](https://music.apple.com/kr/album/run-to-you/307391491?i=307391499&uo=4) · 판정: O
29. 요청 **이적 — 하늘을 달리다** → 결과 **하늘을 달리다 — 이적** (US: Running on the Sky — Lee Juck) · 앨범 2적 · [듣기](https://music.apple.com/kr/album/%ED%95%98%EB%8A%98%EC%9D%84-%EB%8B%AC%EB%A6%AC%EB%8B%A4/362979474?i=362979494&uo=4) · 판정: O
30. 요청 **中島みゆき — 時代** → 결과 **時代 — 中島みゆき** · 앨범 ? · 판정: O
31. 요청 **Radiohead — Everything In Its Right Place** → 결과 **Everything In Its Right Place — Radiohead** · 앨범 Kid A · [듣기](https://music.apple.com/kr/album/everything-in-its-right-place/1097862870?i=1097863108&uo=4) · 판정: O
32. 요청 **오존 — Stay** → 결과 **Stay — 오존** (US: Stay — O3ohn) · 앨범 지리산 (Original Television Soundtrack) Special · [듣기](https://music.apple.com/kr/album/stay/1698514266?i=1698514274&uo=4) · 판정: O
33. 요청 **Iron & Wine — Naked As We Came** → 결과 **Naked As We Came — Iron & Wine** · 앨범 Our Endless Numbered Days · [듣기](https://music.apple.com/kr/album/naked-as-we-came/5644896?i=5644874&uo=4) · 판정: O
34. 요청 **아이유 — 마음을 드려요** → 결과 **마음을 드려요 — 아이유** (US: Give You My Heart — IU) · 앨범 사랑의 불시착 (Original Television Soundtrack), Pt. 11 - Single · [듣기](https://music.apple.com/kr/album/%EB%A7%88%EC%9D%8C%EC%9D%84-%EB%93%9C%EB%A0%A4%EC%9A%94/1499290392?i=1499290393&uo=4) · 판정: O
35. 요청 **Phoenix — Lisztomania** → 결과 **Lisztomania — Phoenix** · 앨범 Wolfgang Amadeus Phoenix · [듣기](https://music.apple.com/kr/album/lisztomania/1771710012?i=1771710017&uo=4) · 판정: O
36. 요청 **Rockwell — Somebody's Watching Me** → 결과 **Somebody's Watching Me — Rockwell** · 앨범 Somebody's Watching Me · [듣기](https://music.apple.com/kr/album/somebodys-watching-me/1584389835?i=1584390038&uo=4) · 판정: O
37. 요청 **DAY6 — 예뻤어** → 결과 **예뻤어 — DAY6** · 앨범 Every DAY6 February - Single · [듣기](https://music.apple.com/us/album/%EC%98%88%EB%BB%A4%EC%96%B4/1695484285?i=1695484286&uo=4) · 판정: O
38. 요청 **AKMU — Give Love** → 결과 **Give Love — 악뮤** (US: Give Love — AKMU) · 앨범 PLAY · [듣기](https://music.apple.com/kr/album/give-love/1316852695?i=1316852696&uo=4) · 판정: O
39. 요청 **이수현 — 나의 봄은** → 결과 **나의 봄은 — 이수현** (US: My Spring — LEE SUHYUN) · 앨범 나의 해방일지 (Original Television Soundtrack) · [듣기](https://music.apple.com/kr/album/%EB%82%98%EC%9D%98-%EB%B4%84%EC%9D%80/1626573520?i=1626573730&uo=4) · 판정: O
40. 요청 **PinkFantasy — 기괴한 이야기 (Get Out)** → 결과 **기괴한 이야기 : Get Out — 핑크판타지** (US: 기괴한 이야기 : Get Out — PinkFantasy) · 앨범 기괴한 이야기 - Single · [듣기](https://music.apple.com/kr/album/%EA%B8%B0%EA%B4%B4%ED%95%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0-get-out/1650742643?i=1650742658&uo=4) · 판정: O
41. 요청 **Lana Del Rey — Summertime Sadness** → 결과 **Summertime Sadness — Lana Del Rey** · 앨범 Born to Die · [듣기](https://music.apple.com/us/album/summertime-sadness/1440811595?i=1440812085&uo=4) · 판정: O
42. 요청 **H.O.T. — 빛 (Hope)** → 결과 **빛 — H.O.T.** (US: Hope — H.O.T.) · 앨범 Resurretion - The 3rd Album · [듣기](https://music.apple.com/kr/album/%EB%B9%9B/1060407199?i=1060407446&uo=4) · 판정: O
43. 요청 **다이나믹 듀오 — BAAAM** → 결과 **BAAAM (feat. 뮤지) — 다이나믹 듀오** (US: Baaam (feat. MUZIE) — Dynamicduo) · 앨범 LUCKYNUMBERS · [듣기](https://music.apple.com/kr/album/baaam-feat-%EB%AE%A4%EC%A7%80/1619465193?i=1619465459&uo=4) · 판정: O
44. 요청 **The Clash — Should I Stay or Should I Go** → 결과 **Should I Stay or Should I Go — The Clash** · 앨범 Combat Rock · [듣기](https://music.apple.com/kr/album/should-i-stay-or-should-i-go/685585931?i=685585941&uo=4) · 판정: O
45. 요청 **오마이걸 — 비밀정원** → 결과 **비밀정원 — 오마이걸** (US: Secret Garden — OH MY GIRL) · 앨범 비밀정원 - EP · [듣기](https://music.apple.com/kr/album/%EB%B9%84%EB%B0%80%EC%A0%95%EC%9B%90/1738879523?i=1738879526&uo=4) · 판정: O
46. 요청 **Maroon 5 — Sugar** → 결과 **Sugar — Maroon 5** · 앨범 V (Deluxe) · [듣기](https://music.apple.com/us/album/sugar/1440855456?i=1440855562&uo=4) · 판정: O
47. 요청 **크라잉넛 — 말 달리자** → 결과 **말 달리자 — 크라잉넛** (US: Speed Up Losers — Crying Nut) · 앨범 말달리자 · [듣기](https://music.apple.com/kr/album/%EB%A7%90-%EB%8B%AC%EB%A6%AC%EC%9E%90/307362575?i=307362583&uo=4) · 판정: O
48. 요청 **임한별 — 이별하러 가는 길** → 결과 **이별하러 가는 길 — 임한별** (US: The Way To Say Goodbye — Onestar) · 앨범 9월 24일 - EP · [듣기](https://music.apple.com/kr/album/%EC%9D%B4%EB%B3%84%ED%95%98%EB%9F%AC-%EA%B0%80%EB%8A%94-%EA%B8%B8/1587313810?i=1587313812&uo=4) · 판정: O
49. 요청 **Vulfpeck — Back Pocket** → 결과 **Back Pocket (feat. Theo Katzman, Christine Hucal & Mark Dover) — Vulfpeck** · 앨범 Thrill of the Arts · [듣기](https://music.apple.com/kr/album/back-pocket-feat-theo-katzman-christine-hucal-mark-dover/1877221220?i=1877221222&uo=4) · 판정: O
50. 요청 **Perfume — Magic of Love** → 결과 **Magic of Love — Perfume** · 앨범 Magic of Love - Single · [듣기](https://music.apple.com/kr/album/magic-of-love/1444865005?i=1444865013&uo=4) · 판정: O
51. 요청 **Simon & Garfunkel — Bridge over Troubled Water** → 결과 **Bridge Over Troubled Water — Simon & Garfunkel** · 앨범 Bridge Over Troubled Water · [듣기](https://music.apple.com/kr/album/bridge-over-troubled-water/324127933?i=324127934&uo=4) · 판정: O
52. 요청 **Aimer — Brave Shine** → 결과 **Brave Shine — 에메** (US: Brave Shine — Aimer) · 앨범 DAWN · [듣기](https://music.apple.com/kr/album/brave-shine/1536130464?i=1536130474&uo=4) · 판정: O
53. 요청 **Bruno Mars — Locked Out of Heaven** → 결과 **Locked Out of Heaven — Bruno Mars** · 앨범 Unorthodox Jukebox · [듣기](https://music.apple.com/kr/album/locked-out-of-heaven/573962245?i=573962551&uo=4) · 판정: O
54. 요청 **이진아 — 냠냠냠** → 결과 **냠냠냠 (Rebooted Version) [feat. 탁] — 이진아** (US: Yum Yum Yum (Rebooted Version) [feat. Tak] — Lee Jin Ah) · 앨범 진아식당 Full Course · [듣기](https://music.apple.com/kr/album/%EB%83%A0%EB%83%A0%EB%83%A0-rebooted-version-feat-%ED%83%81/1527242330?i=1527242468&uo=4) · 판정: V
55. 요청 **Coldplay — Everglow** → 결과 **Everglow — Coldplay** · 앨범 A Head Full of Dreams · [듣기](https://music.apple.com/kr/album/everglow/1053933969?i=1053934845&uo=4) · 판정: O
56. 요청 **Banks — Waiting Game** → 결과 **Waiting Game — Banks** (US: Waiting Game — BANKS) · 앨범 Goddess (Deluxe Version) · [듣기](https://music.apple.com/kr/album/waiting-game/1440852355?i=1440852363&uo=4) · 판정: O
57. 요청 **스텔라장 — Colors** → 결과 **Colors — 스텔라장** (US: Colors — Stella Jang) · 앨범 Colors · [듣기](https://music.apple.com/kr/album/colors/1464915952?i=1464915954&uo=4) · 판정: O
58. 요청 **이랑 — 늑대가 나타났다** → 결과 **늑대가 나타났다 — 이랑** (US: There is A Wolf — Lang Lee) · 앨범 늑대가 나타났다 · [듣기](https://music.apple.com/kr/album/%EB%8A%91%EB%8C%80%EA%B0%80-%EB%82%98%ED%83%80%EB%82%AC%EB%8B%A4/1703578645?i=1703578646&uo=4) · 판정: O
59. 요청 **James Taylor — You've Got a Friend** → 결과 **You've Got a Friend — James Taylor** · 앨범 Mud Slide Slim and the Blue Horizon (Remastered) · [듣기](https://music.apple.com/kr/album/youve-got-a-friend/1485665385?i=1485665387&uo=4) · 판정: O
60. 요청 **Walk the Moon — Shut Up and Dance** → 결과 **Shut Up and Dance — WALK THE MOON** · 앨범 TALKING IS HARD (Expanded Edition) · [듣기](https://music.apple.com/kr/album/shut-up-and-dance/961298415?i=961298418&uo=4) · 판정: O
61. 요청 **Olivia Rodrigo — good 4 u** → 결과 **good 4 u — Olivia Rodrigo** · 앨범 SOUR (Video Version) · [듣기](https://music.apple.com/kr/album/good-4-u/1582277315?i=1582277652&uo=4) · 판정: O
62. 요청 **Aimer — Hana no Uta** → 결과 **花の唄 — 에메** (US: Hana No Uta — Aimer) · 앨범 ONE / 花の唄 / 六等星の夜 Magic Blue ver. - EP · [듣기](https://music.apple.com/kr/album/%E8%8A%B1%E3%81%AE%E5%94%84/1538260049?i=1538260051&uo=4) · 판정: O
63. 요청 **양희은 — 엄마가 딸에게** → 결과 **엄마가 딸에게 (Original ver.) [feat. 김규리] — 양희은 & 김창기** (US: Mother to Daughter (Original ver.) [feat. Kim Kyuri] — Yang Hee Eun & Kim Chang Ki) · 앨범 '뜻밖의 만남' 네 번째 (feat. 김규리) - Single · [듣기](https://music.apple.com/kr/album/%EC%97%84%EB%A7%88%EA%B0%80-%EB%94%B8%EC%97%90%EA%B2%8C-original-ver-feat-%EA%B9%80%EA%B7%9C%EB%A6%AC/1855745024?i=1855745027&uo=4) · 판정: O
64. 요청 **악뮤 — DINOSAUR** → 결과 **DINOSAUR — 악뮤** (US: DINOSAUR — AKMU) · 앨범 SUMMER EPISODE - EP · [듣기](https://music.apple.com/kr/album/dinosaur/1261291981?i=1261291986&uo=4) · 판정: O
65. 요청 **헤이즈 — 떨어지는 낙엽까지도** → 결과 **떨어지는 낙엽까지도 — 헤이즈** (US: Falling Leaves are Beautiful — Heize) · 앨범 만추 - EP · [듣기](https://music.apple.com/kr/album/%EB%96%A8%EC%96%B4%EC%A7%80%EB%8A%94-%EB%82%99%EC%97%BD%EA%B9%8C%EC%A7%80%EB%8F%84/1608325356?i=1608325362&uo=4) · 판정: O
66. 요청 **大塚 愛 — さくらんぼ** → 결과 **さくらんぼ — 오오츠카 아이** (US: Sakuranbo — Ai Otsuka) · 앨범 Love Punch · [듣기](https://music.apple.com/kr/album/%E3%81%95%E3%81%8F%E3%82%89%E3%82%93%E3%81%BC/76106703?i=76106271&uo=4) · 판정: O
67. 요청 **Elton John — Your Song** → 결과 **Your Song — Elton John** · 앨범 Elton John · [듣기](https://music.apple.com/kr/album/your-song/1440810640?i=1440810937&uo=4) · 판정: O
68. 요청 **Queen — Don't Stop Me Now** → 결과 **Don't Stop Me Now — Queen** · 앨범 Jazz (Deluxe Edition) · [듣기](https://music.apple.com/kr/album/dont-stop-me-now/6781079346?i=6781079518&uo=4) · 판정: O
69. 요청 **Adele — Send My Love (To Your New Lover)** → 결과 **Send My Love (To Your New Lover) — Adele** · 앨범 25 · [듣기](https://music.apple.com/us/album/send-my-love-to-your-new-lover/1544494115?i=1544494394&uo=4) · 판정: O
70. 요청 **10CM — 쓰담쓰담** → 결과 **쓰담쓰담 — 10CM** (US: Sseudam Sseudam (Caress) — 10CM) · 앨범 3.0 · [듣기](https://music.apple.com/kr/album/%EC%93%B0%EB%8B%B4%EC%93%B0%EB%8B%B4/1747659157?i=1747659161&uo=4) · 판정: O
71. 요청 **FTISLAND — 바래** → 결과 **바래 — FTISLAND** (US: I Hope — FTISLAND) · 앨범 Double Date · [듣기](https://music.apple.com/kr/album/%EB%B0%94%EB%9E%98/6809690802?i=6809690818&uo=4) · 판정: O
72. 요청 **Crush — Nappa** → 결과 **나빠 — Crush** (US: NAPPA — Crush) · 앨범 나빠 - Single · [듣기](https://music.apple.com/kr/album/%EB%82%98%EB%B9%A0/1477713319?i=1477713320&uo=4) · 판정: O
73. 요청 **嵐 — Happiness** → 결과 **Happiness — ARASHI** · 앨범 Happiness - Single · [듣기](https://music.apple.com/kr/album/happiness/1485847848?i=1485847849&uo=4) · 판정: O
74. 요청 **Bill Withers — Lean on Me** → 결과 **Lean on Me — Bill Withers** · 앨범 Still Bill · [듣기](https://music.apple.com/kr/album/lean-on-me/989376986?i=989376991&uo=4) · 판정: O
75. 요청 **김현철 — 춘천가는 기차** → 결과 **춘천가는 기차 — 김현철** (US: 춘천가는 기차 — Kim Hyun Chul) · 앨범 김현철 Vol.1 (오랜만에/동네) · [듣기](https://music.apple.com/kr/album/%EC%B6%98%EC%B2%9C%EA%B0%80%EB%8A%94-%EA%B8%B0%EC%B0%A8/1804595366?i=1804595369&uo=4) · 판정: O
76. 요청 **IU — 팔레트** → 결과 **팔레트 (feat. G-DRAGON) — 아이유** (US: Palette (feat. G-DRAGON) — IU) · 앨범 Palette · [듣기](https://music.apple.com/kr/album/%ED%8C%94%EB%A0%88%ED%8A%B8-feat-g-dragon/1229073300?i=1229073310&uo=4) · 판정: O
77. 요청 **Carpenters — Yesterday Once More** → 결과 **Yesterday Once More — Carpenters** · 앨범 Now & Then (Reissue) · [듣기](https://music.apple.com/kr/album/yesterday-once-more/1434886548?i=1434886946&uo=4) · 판정: O
78. 요청 **Sia — Chandelier** → 결과 **Chandelier — Sia** · 앨범 1000 Forms of Fear · [듣기](https://music.apple.com/kr/album/chandelier/882945378?i=882945383&uo=4) · 판정: O
79. 요청 **블락비 — HER** → 결과 **HER — 블락비** (US: HER — Block B) · 앨범 HER - EP · [듣기](https://music.apple.com/kr/album/her/1570372340?i=1570372344&uo=4) · 판정: O
80. 요청 **변진섭 — 너에게로 또 다시** → 결과 **너에게로 또 다시 — 변진섭** (US: 너에게로 또 다시 — Byun Jin Sub) · 앨범 너에게로 또 다시 · [듣기](https://music.apple.com/kr/album/%EB%84%88%EC%97%90%EA%B2%8C%EB%A1%9C-%EB%98%90-%EB%8B%A4%EC%8B%9C/1617968177?i=1617968178&uo=4) · 판정: O
81. 요청 **Sam Smith — Latch** → 결과 **Latch — Disclosure & Sam Smith** · 앨범 Settle (Deluxe) · [듣기](https://music.apple.com/us/album/latch/1440862011?i=1440862129&uo=4) · 판정: O
82. 요청 **백지영 — 잊지 말아요** → 결과 **잊지 말아요 — 백지영 & 임영웅** (US: Don't Forget Me — Baek Z Young & Lim Young Woong) · 앨범 뽕숭아학당, Pt. 2 · [듣기](https://music.apple.com/kr/album/%EC%9E%8A%EC%A7%80-%EB%A7%90%EC%95%84%EC%9A%94/1515441266?i=1515441267&uo=4) · 판정: V
83. 요청 **中島美嘉 — 一色** → 결과 **一色 — NANA & 나카시마 미카** (US: Hitoiro — NANA & Mika Nakashima) · 앨범 THE END · [듣기](https://music.apple.com/kr/album/%E4%B8%80%E8%89%B2/1535605056?i=1535605059&uo=4) · 판정: O
84. 요청 **AURORA — Runaway** → 결과 **Runaway — AURORA** · 앨범 FOR THE HUMANS WHO TAKE LONG WALKS IN THE FOREST - EP · [듣기](https://music.apple.com/us/album/runaway/1640380703?i=1640380713&uo=4) · 판정: O
85. 요청 **Foster The People — Sit Next to Me** → 결과 **Sit Next to Me — Foster the People** · 앨범 Sacred Hearts Club · [듣기](https://music.apple.com/kr/album/sit-next-to-me/1247002400?i=1247002415&uo=4) · 판정: O
86. 요청 **Mark Ronson — Valerie** → 결과 **Valerie (feat. Amy Winehouse) — Mark Ronson** · 앨범 Version · [듣기](https://music.apple.com/kr/album/valerie-feat-amy-winehouse/259214420?i=259214627&uo=4) · 판정: O
87. 요청 **Lord Huron — The Night We Met** → 결과 **The Night We Met — Lord Huron** · 앨범 Strange Trails · [듣기](https://music.apple.com/kr/album/the-night-we-met/1806531135?i=1806531961&uo=4) · 판정: O
88. 요청 **싸이 — 챔피언** → 결과 **챔피언 — 싸이** (US: 챔피언 — PSY) · 앨범 Psy 3 · [듣기](https://music.apple.com/kr/album/%EC%B1%94%ED%94%BC%EC%96%B8/1574481873?i=1574482348&uo=4) · 판정: O
89. 요청 **10CM — 사랑은 은하수 다방에서** → 결과 **사랑은 은하수 다방에서 — 10CM** (US: Love in the Milky Way Cafe — 10CM) · 앨범 1.0 · [듣기](https://music.apple.com/kr/album/%EC%82%AC%EB%9E%91%EC%9D%80-%EC%9D%80%ED%95%98%EC%88%98-%EB%8B%A4%EB%B0%A9%EC%97%90%EC%84%9C/1809385483?i=1809385488&uo=4) · 판정: O
90. 요청 **Epik High — Lovedrunk** → 결과 **술이 달다 (feat. 크러쉬) — 에픽하이** (US: Lovedrunk (feat. Crush) — Epik High) · 앨범 Sleepless In \***\*\_\_\*\*** · [듣기](https://music.apple.com/kr/album/%EC%88%A0%EC%9D%B4-%EB%8B%AC%EB%8B%A4-feat-%ED%81%AC%EB%9F%AC%EC%89%AC/1581525014?i=1581525017&uo=4) · 판정: O
91. 요청 **YUI — CHE.R.RY** → 결과 **CHE.R.RY - From THE FIRST TAKE — 유이** (US: CHE.R.RY - From THE FIRST TAKE — YUI) · 앨범 CHE.R.RY - From THE FIRST TAKE - Single · [듣기](https://music.apple.com/kr/album/che-r-ry-from-the-first-take/1592088692?i=1592088786&uo=4) · 판정: X
92. 요청 **ゆず — 栄光の架橋** → 결과 **栄光の架橋 — ゆず** · 앨범 ? · 판정: O
93. 요청 **Simon & Garfunkel — The Sound of Silence** → 결과 **The Sound of Silence — Simon & Garfunkel** · 앨범 Sounds of Silence · [듣기](https://music.apple.com/kr/album/the-sound-of-silence/192480256?i=192480260&uo=4) · 판정: O
94. 요청 **노라조 — 슈퍼맨** → 결과 **슈퍼맨 — 노라조** (US: 슈퍼맨 — NORAZO) · 앨범 Three GO · [듣기](https://music.apple.com/kr/album/%EC%8A%88%ED%8D%BC%EB%A7%A8/1449536685?i=1449536686&uo=4) · 판정: O
95. 요청 **Rachel Platten — Fight Song** → 결과 **Fight Song — Rachel Platten** · 앨범 Wildfire · [듣기](https://music.apple.com/kr/album/fight-song/1061182666?i=1061182684&uo=4) · 판정: O
96. 요청 **Vance Joy — Riptide** → 결과 **Riptide — Vance Joy** · 앨범 Dream Your Life Away (Special Edition) · [듣기](https://music.apple.com/kr/album/riptide/1022164257?i=1022164261&uo=4) · 판정: O
97. 요청 **The Beach Boys — Wouldn't It Be Nice** → 결과 **Wouldn't It Be Nice — The Beach Boys** · 앨범 Pet Sounds (Mono & Stereo) [2001 Remaster] · [듣기](https://music.apple.com/kr/album/wouldnt-it-be-nice/1440842926?i=1440843863&uo=4) · 판정: O
98. 요청 **선우정아 — 구애** → 결과 **구애 — 선우정아** (US: Propose — sunwoojunga) · 앨범 구애 - Single · [듣기](https://music.apple.com/kr/album/%EA%B5%AC%EC%95%A0/1748199765?i=1748199766&uo=4) · 판정: O
99. 요청 **Zion.T — 양화대교** → 결과 **양화대교 — Zion.T** (US: Yanghwa BRDG — Zion.T) · 앨범 양화대교 - Single · [듣기](https://music.apple.com/kr/album/%EC%96%91%ED%99%94%EB%8C%80%EA%B5%90/1607289311?i=1607289319&uo=4) · 판정: O
100. 요청 **Cyndi Lauper — Girls Just Want to Have Fun** → 결과 **Girls Just Want to Have Fun — Cyndi Lauper** · 앨범 She's So Unusual · [듣기](https://music.apple.com/kr/album/girls-just-want-to-have-fun/400603643?i=400603693&uo=4) · 판정: O

---

## (선택) 해석 실패 곡 — 실제로 있는 곡인지

v2가 못 찾은 곡 중 자동 분류로 존재 여부를 판단하지 못한 16곡. 판정의 **O** = 그 가수의 그 곡이 실제로 있음, **X** = 다른 가수의 곡이거나 없는 곡. 괄호는 실제 가수 — 곡.

E01. **태연 — 숨겨진 세상** · 판정: O
E02. **혁오 — 톨게이트** · 판정: X ()
E03. **DAWN — Dawndidawnda** · 판정: O
E04. **스텔라장 — 월화수목금토일** · 판정: X (스텔라장 - 어떤 날들)
E05. **오존 — 반딧불이** · 판정: X (황가람 - 나는 반딧불)
E06. **크러쉬 — 어때** · 판정: X (긱스 - 어때)
E07. **이승윤 — 숲** · 판정: X (최유리 - 숲)
E08. **이승철 — 소녀의 기도** · 판정: X (이선희 - 소녀의 기도)
E09. **에피톤 프로젝트 — 선물** · 판정: X (멜로망스 - 선물)
E10. **찬열 — 너와 나** · 판정: X (홍대광 - 너와 나)
E11. **김나영 — 솔직히 지쳤어** · 판정: X
E12. **먼데이 키즈 — 가끔** · 판정: X (크러쉬 - 가끔)
E13. **샘김 — 향수 (Nostalgia)** · 판정: X (샘김 - 향기)
E14. **새소년 — 나를 잊지 말아요** · 판정: X (허각 - 나를 잊지 말아요)
E15. **새소년 — 달의 뒤편으로 와요** · 판정: X (프롬 - 달의 뒤편으로 와요)
E16. **적재 — 나랑 아니면** · 판정: X (검정치마 - 나랑 아니면)
