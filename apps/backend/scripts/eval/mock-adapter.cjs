/**
 * 키 없이 프로브(probe-picks.cjs --mock)를 자체 검증하기 위한 가짜 axios 어댑터 — iTunes 응답을 흉내.
 * OpenAI 응답은 프로브가 직접 흉내 낸다. 실제 네트워크로는 아무것도 나가지 않는다.
 * - 응답 지연을 무작위로 줘서 immerse/soothe 병렬 호출이 뒤섞이게 한다 (모드 귀속 검증)
 * - 일부 iTunes 호출은 403, 일부는 다른 곡명 → throttle·곡명 대조 실패 경로도 지나가게 한다
 * (기준선 하네스 run.cjs가 쓰던 OpenAI 시드 응답·Last.fm 응답 흉내는 R4에서 삭제 — 커밋 56dd4dd 참고)
 */
const { AxiosError } = require('axios');

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  if (host === 'itunes.apple.com') ({ status, data } = itunesResponse(config));
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
