/**
 * 키·네트워크 없이 응답 시간 하네스를 자체 검증하기 위한 모의 장치 (probe-latency.cjs --mock).
 * 서버에 net-tap.cjs 다음으로 끼운다: node -r net-tap.cjs -r net-mock.cjs dist/main.js
 *
 * - 서버의 axios 기본 어댑터를 바꿔 OpenAI 선곡 응답과 iTunes 검색·조회 응답을 흉내 낸다 → 밖으로 아무것도 나가지 않는다
 * - 진짜 네트워크를 타지 않아 net-tap이 못 보므로, 호출 기록은 여기서 net-tap 형식으로 직접 남긴다
 * - 실패 경로도 지나가게: iTunes 40번째 호출마다 403(차단), 검색어 9개 중 1개는 다른 곡명(곡명 대조 실패)
 * - OpenAI 스트림 요청(stream: true)에는 SSE 조각을 시간차를 두고 흘려보낸다 — 곡이 하나씩 써지는 흉내
 * - 측정값 자체는 의미 없다 (지연은 흉내일 뿐) — 하네스가 서버를 띄우고, 요청하고, 기록·요약하는지만 본다
 */
const { Readable } = require('node:stream');
const axios = require('axios');
const { record } = require('./net-tap.cjs');

const EMOTIONS = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'surprise',
  'neutral',
  'sentimental',
  'excited',
  'lonely',
  'dreamy',
  'confident',
  'romance',
];

function hash(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 가짜 곡 목록 — 아티스트마다 한 곡(1아티스트 1곡 규칙에 안 걸리게), 지역별로 넉넉히
const REGION_SIZES = { korea: 24, pop: 14, jpop: 8 };
const CATALOG = Object.entries(REGION_SIZES).flatMap(([region, size], r) =>
  Array.from({ length: size }, (_, k) => ({
    region,
    artist: `Mock${region}${k}`,
    title: `Song ${region} ${k}`,
    trackId: 100000 + r * 1000 + k,
    artistId: 500000 + r * 1000 + k,
  })),
);
const byTerm = new Map(
  CATALOG.map((song) => [`${song.artist} ${song.title}`, song]),
);
const byId = new Map(CATALOG.map((song) => [song.trackId, song]));

const toTrack = (song, trackName = song.title) => ({
  trackId: song.trackId,
  trackName,
  artistName: song.artist,
  artistId: song.artistId,
  collectionName: 'Mock Album',
  artworkUrl100: 'https://example.invalid/100x100bb.jpg',
  trackTimeMillis: 200000,
  previewUrl: 'https://example.invalid/preview.m4a',
  trackViewUrl: 'https://example.invalid/view',
  primaryGenreName: 'Mock',
});

/** 글마다 다른 곡을 고르도록 지역별 시작 위치를 글의 해시로 정한다 */
function pickFor(text, counts, salt) {
  const h = hash(`${salt}|${text}`);
  return Object.entries(counts).flatMap(([region, n]) => {
    const pool = CATALOG.filter((song) => song.region === region);
    return Array.from({ length: n }, (_, k) => pool[(h + k) % pool.length]).map(
      ({ artist, title }) => ({ artist, title, region }),
    );
  });
}

async function openai(config) {
  const body = JSON.parse(config.data);
  const text = body.messages.at(-1).content;
  const pick = {
    emotion: EMOTIONS[hash(text) % EMOTIONS.length],
    crisis: false,
    description: '모의 응답이에요.',
    immerse: pickFor(text, { korea: 7, pop: 3, jpop: 2 }, 'immerse'),
    soothe: pickFor(text, { korea: 8, pop: 5, jpop: 2 }, 'soothe'),
  };
  if (body.stream) {
    // 첫 조각까지 잠깐, 그 뒤 몇 글자씩 30ms 간격 (실제 속도가 아니라 "조각으로 온다"만 흉내)
    await sleep(300);
    const content = JSON.stringify(pick);
    const frame = (choice) =>
      Buffer.from(`data: ${JSON.stringify({ choices: [choice] })}\n\n`);
    async function* frames() {
      for (let i = 0; i < content.length; i += 24) {
        await sleep(30);
        yield frame({
          delta: { content: content.slice(i, i + 24) },
          finish_reason: null,
        });
      }
      yield frame({ delta: {}, finish_reason: 'stop' });
      yield Buffer.from('data: [DONE]\n\n');
    }
    return { status: 200, data: Readable.from(frames()), streaming: true };
  }
  await sleep(1200 + (hash(text) % 600));
  return {
    status: 200,
    data: {
      choices: [
        {
          message: { content: JSON.stringify(pick), refusal: null },
          finish_reason: 'stop',
        },
      ],
    },
  };
}

let itunesCalls = 0;
async function itunes(pathname, params) {
  itunesCalls += 1;
  await sleep(40 + (hash(JSON.stringify(params)) % 120));
  if (itunesCalls % 40 === 0) return { status: 403, data: {} };
  if (pathname === '/lookup') {
    const tracks = String(params.id)
      .split(',')
      .map(Number)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((song) => toTrack(song));
    return {
      status: 200,
      data: { resultCount: tracks.length, results: tracks },
    };
  }
  const song =
    params.entity === 'musicArtist' ? null : byTerm.get(String(params.term));
  if (!song) return { status: 200, data: { resultCount: 0, results: [] } };
  const trackName = hash(params.term) % 9 === 0 ? 'Different Song' : song.title;
  return {
    status: 200,
    data: { resultCount: 1, results: [toTrack(song, trackName)] },
  };
}

async function mockAdapter(config) {
  const url = new URL(config.url);
  const t0 = Date.now();
  let result;
  if (url.host === 'api.openai.com') result = await openai(config);
  else if (url.host === 'itunes.apple.com')
    result = await itunes(url.pathname, config.params ?? {});
  else throw new Error(`net-mock: 모르는 호스트 ${url.host}`);
  const tHead = Date.now();
  const call = {
    host: url.host,
    method: (config.method ?? 'get').toUpperCase(),
    path: url.pathname,
    t0,
    tHead,
    status: result.status,
    mock: true,
  };
  // 스트림은 다 흘려보낸 뒤에 끝 시각을 남긴다
  if (result.streaming) {
    let recorded = false;
    const finish = () => {
      if (recorded) return;
      recorded = true;
      record({ ...call, tEnd: Date.now() });
    };
    result.data.once('end', finish);
    result.data.once('close', finish);
  } else record({ ...call, tEnd: tHead });

  const response = {
    data: result.data,
    status: result.status,
    statusText: String(result.status),
    headers: {},
    config,
    request: {},
  };
  if (result.status >= 400) {
    throw new axios.AxiosError(
      `Request failed with status code ${result.status}`,
      'ERR_BAD_REQUEST',
      config,
      {},
      response,
    );
  }
  return response;
}

axios.defaults.adapter = mockAdapter;
