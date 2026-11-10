/**
 * 외부 호출 기록 장치 — 측정할 때만 서버에 끼운다: node -r scripts/eval/net-tap.cjs dist/main.js
 *
 * Node 기본 기능(diagnostics_channel)으로 서버가 밖으로 보내는 HTTP 요청을 지켜보기만 한다.
 * 운영 코드는 바꾸지 않고, 요청·응답에도 손대지 않는다. 호출 하나가 끝날 때마다 stdout에 한 줄:
 *   [net-tap] {"host":"itunes.apple.com","method":"GET","path":"/search","t0":…,"tHead":…,"tEnd":…,"status":200}
 * - t0 요청 시작 · tHead 응답 헤더 도착 · tEnd 응답 끝 (모두 Date.now() ms — 하네스와 같은 시계)
 * - 경로의 쿼리(검색어)와 헤더(인증 키)는 남기지 않는다
 * - axios는 Node http 모듈(http.client.*)로, fetch는 undici(undici:request:*)로 나가서 둘 다 본다
 */
const dc = require('node:diagnostics_channel');

const PREFIX = '[net-tap] ';
const pathOnly = (p) => String(p ?? '').split('?')[0];

/** 기록 한 줄 남기기 — 진짜 네트워크를 타지 않는 모의 어댑터(net-mock.cjs)도 이 함수로 같은 형식을 남긴다 */
function record(entry) {
  process.stdout.write(`${PREFIX}${JSON.stringify(entry)}\n`);
}

// ── axios (Node http/https) ──
const httpCalls = new WeakMap();

dc.subscribe('http.client.request.start', ({ request }) => {
  httpCalls.set(request, {
    host: request.host,
    method: request.method,
    path: pathOnly(request.path),
    t0: Date.now(),
  });
});

dc.subscribe('http.client.response.finish', ({ request, response }) => {
  const call = httpCalls.get(request);
  if (!call) return;
  call.tHead = Date.now();
  call.status = response.statusCode;
  // 'end' 리스너만 단다 — 'data'를 달면 스트림 흐름이 바뀐다
  response.once('end', () => {
    httpCalls.delete(request);
    record({ ...call, tEnd: Date.now() });
  });
});

dc.subscribe('http.client.request.error', ({ request, error }) => {
  const call = httpCalls.get(request);
  if (!call) return;
  httpCalls.delete(request);
  record({ ...call, tEnd: Date.now(), error: error.code ?? error.message });
});

// ── fetch (undici) — 지금 서버는 쓰지 않지만 스트리밍 전환 때 쓸 수 있어 같이 본다 ──
const fetchCalls = new WeakMap();

dc.subscribe('undici:request:create', ({ request }) => {
  fetchCalls.set(request, {
    host: new URL(request.origin).host,
    method: request.method,
    path: pathOnly(request.path),
    t0: Date.now(),
  });
});

dc.subscribe('undici:request:headers', ({ request, response }) => {
  const call = fetchCalls.get(request);
  if (!call) return;
  call.tHead = Date.now();
  call.status = response.statusCode;
});

dc.subscribe('undici:request:trailers', ({ request }) => {
  const call = fetchCalls.get(request);
  if (!call) return;
  fetchCalls.delete(request);
  record({ ...call, tEnd: Date.now() });
});

dc.subscribe('undici:request:error', ({ request, error }) => {
  const call = fetchCalls.get(request);
  if (!call) return;
  fetchCalls.delete(request);
  record({ ...call, tEnd: Date.now(), error: error.code ?? error.message });
});

module.exports = { record, PREFIX };
