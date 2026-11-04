/**
 * 키 없이 하네스를 자체 검증하기 위한 가짜 axios 어댑터.
 * 실제 네트워크로는 아무것도 나가지 않는다 (OpenAI·Last.fm·iTunes 응답을 흉내).
 * - 응답 지연을 무작위로 줘서 immerse/soothe 병렬 호출이 뒤섞이게 한다 (모드 귀속 검증)
 * - 일부 시드는 유사곡 0개, 일부 iTunes 호출은 403 → 확장 실패·throttle 경로도 지나가게 한다
 */
const { AxiosError } = require('axios');

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
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 아티스트명은 공백 없는 토큰 — iTunes 검색어 "artist title" 을 다시 나눌 수 있게
const seedsFor = (mode, h) => ({
  korea: [1, 2, 3].map((i) => ({
    artist: `KR${mode}${(h + i) % 7}`,
    title: `kr ${mode} song ${i}`,
  })),
  pop: [1, 2].map((i) => ({
    artist: `POP${mode}${(h + i) % 5}`,
    title: `pop ${mode} song ${i}`,
  })),
  jpop: [{ artist: `JP${mode}${h % 3}`, title: `jp ${mode} song 1` }],
});

function openaiResponse(config) {
  const body = JSON.parse(config.data);
  const text = body.messages.at(-1).content;
  const h = hash(text);
  const emotion = EMOTIONS[h % EMOTIONS.length];
  const content = {
    emotion,
    crisis: false,
    description: '모의 응답',
    immerse: { keywords: 'mock', genres: ['pop'], seeds: seedsFor('im', h) },
    soothe: { keywords: 'mock', genres: ['jazz'], seeds: seedsFor('so', h) },
  };
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 3000, completion_tokens: 500, total_tokens: 3500 },
  };
}

function lastfmResponse(config) {
  const { artist } = config.params;
  // 한국 시드의 절반은 확장 0개 (실서비스의 한국 확장 실패 흉내)
  const count =
    artist.startsWith('KR') && hash(artist) % 2 === 0
      ? 0
      : 5 + (hash(artist) % 10);
  return {
    similartracks: {
      track: Array.from({ length: count }, (_, i) => ({
        name: `similar ${i}`,
        match: String(1 - (i + 1) / 20),
        artist: { name: `${artist}x${i}` },
      })),
    },
  };
}

let itunesCalls = 0;
function itunesResponse(config) {
  itunesCalls += 1;
  if (itunesCalls % 37 === 0) return { status: 403 };
  const term = String(config.params.term);
  const space = term.indexOf(' ');
  const [artist, title] = [term.slice(0, space), term.slice(space + 1)];
  // 일부 곡은 다른 곡명을 돌려줌 (조용한 실패 → 곡명 대조로 폐기되는 경로)
  const trackName = hash(term) % 6 === 0 ? 'Different Song' : title;
  return {
    status: 200,
    data: {
      results: [
        {
          trackId: hash(`${term}|${config.params.country}`),
          trackName,
          artistName: artist,
          collectionName: 'Mock Album',
          artworkUrl100: 'https://example.invalid/100x100bb.jpg',
          trackTimeMillis: 200000,
          previewUrl: 'https://example.invalid/preview',
          trackViewUrl: 'https://example.invalid/view',
          primaryGenreName: 'Mock',
        },
      ],
    },
  };
}

async function mockAdapter(config) {
  await sleep(
    5 + (hash(JSON.stringify(config.params ?? config.data ?? '')) % 40),
  );
  const host = new URL(config.url).host;
  let status = 200;
  let data;
  if (host === 'api.openai.com') data = openaiResponse(config);
  else if (host === 'ws.audioscrobbler.com') data = lastfmResponse(config);
  else if (host === 'itunes.apple.com')
    ({ status, data } = itunesResponse(config));
  else throw new Error(`모의 어댑터: 알 수 없는 호스트 ${host}`);

  const response = {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
    request: {},
  };
  if (status >= 400) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      'ERR_BAD_REQUEST',
      config,
      {},
      response,
    );
  }
  return response;
}

module.exports = { mockAdapter };
