/**
 * 평가 하네스 계측 — 앱 코드를 바꾸지 않고 런타임에 관찰만 한다.
 * - AsyncLocalStorage 로 "지금 어떤 요청(run)·어떤 모드"의 호출인지 추적
 *   (immerse/soothe 가 병렬로 돌아도 HTTP 호출이 올바른 모드에 귀속되도록)
 * - axios 인터셉터로 호스트별 HTTP 호출·상태·지연 집계
 * - 서비스 인스턴스 메서드를 감싸 단계별 입출력 기록 (기준선 파이프라인 구조 전용)
 */
const { AsyncLocalStorage } = require('node:async_hooks');
const { performance } = require('node:perf_hooks');

const als = new AsyncLocalStorage();

const currentRun = () => als.getStore()?.run;
const currentMode = () => als.getStore()?.mode;

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

/** 요청 1건의 기록 틀 */
function createRun() {
  return { http: [], logs: [], llm: null, modes: {} };
}

function modeRecord(run, mode) {
  run.modes[mode] ??= {
    ms: null,
    tracks: [],
    candidates: null,
    similar: [],
    resolveCalls: [],
    resolve: {},
  };
  return run.modes[mode];
}

function installAxiosProbe(axios) {
  axios.interceptors.request.use((config) => {
    config.__probe = {
      start: performance.now(),
      run: currentRun(),
      mode: currentMode(),
      // OpenAI 요청 본문의 model — 실제로 호출된 모델을 기록 (코드 하드코딩 값과 대조용)
      model:
        config.data && typeof config.data === 'object'
          ? config.data.model
          : undefined,
    };
    return config;
  });

  const record = (config, status, data, error) => {
    const probe = config?.__probe;
    if (!probe?.run) return; // 부팅 등 요청 밖에서 나간 호출은 집계하지 않음
    probe.run.http.push({
      host: hostOf(config.url),
      mode: probe.mode ?? null,
      status,
      ms: Math.round(performance.now() - probe.start),
      ...(probe.model ? { model: probe.model } : {}),
      ...(data?.usage ? { usage: data.usage } : {}),
      ...(error ? { error } : {}),
    });
  };

  axios.interceptors.response.use(
    (res) => {
      record(res.config, res.status, res.data);
      return res;
    },
    (err) => {
      record(
        err.config,
        err.response?.status ?? null,
        null,
        err.code ?? err.message,
      );
      return Promise.reject(err);
    },
  );
}

/** obj[name] 을 감싼다. 대상 메서드가 없으면 즉시 실패 — 내부 구조가 바뀐 버전을 조용히 잘못 재지 않게 */
function wrap(obj, name, around) {
  const original = obj[name];
  if (typeof original !== 'function') {
    throw new Error(`계측 대상 메서드 없음: ${obj.constructor.name}.${name}`);
  }
  obj[name] = function (...args) {
    return around(original.bind(this), ...args);
  };
}

const pickTrack = (t) => ({
  trackId: t.trackId,
  trackName: t.trackName,
  artistName: t.artistName,
  collectionName: t.collectionName,
  primaryGenreName: t.primaryGenreName ?? null,
});

/** 기준선(e4cda32) 파이프라인 구조에 맞춘 단계 계측 */
function installBaselineHooks({ openai, music, lastfm, itunes }) {
  wrap(openai, 'analyzeEmotion', async (original, text) => {
    const run = currentRun();
    const start = performance.now();
    try {
      const output = await original(text);
      if (run) run.llm = { ms: Math.round(performance.now() - start), output };
      return output;
    } catch (error) {
      if (run) {
        run.llm = {
          ms: Math.round(performance.now() - start),
          error: String(error?.message ?? error),
        };
      }
      throw error;
    }
  });

  wrap(music, 'getRecommendations', (original, seeds, mode) => {
    const run = currentRun();
    if (!run) return original(seeds, mode);
    return als.run({ run, mode }, async () => {
      const rec = modeRecord(run, mode);
      const start = performance.now();
      const tracks = await original(seeds, mode);
      rec.ms = Math.round(performance.now() - start);
      rec.tracks = tracks.map(pickTrack);
      return tracks;
    });
  });

  wrap(music, 'collectCandidates', async (original, seeds) => {
    const byRegion = await original(seeds);
    const run = currentRun();
    if (run) {
      modeRecord(run, currentMode()).candidates = Object.fromEntries(
        Object.entries(byRegion).map(([region, list]) => [
          region,
          list.map((c) => ({
            artist: c.artist,
            title: c.title,
            match: c.match,
          })),
        ]),
      );
    }
    return byRegion;
  });

  wrap(music, 'resolveUntil', async (original, candidates, region, need) => {
    const result = await original(candidates, region, need);
    const run = currentRun();
    if (run) {
      modeRecord(run, currentMode()).resolve[region] = {
        need,
        pool: candidates.length,
        tried: result.tried,
        resolved: result.resolved.map((r) => ({
          trackId: r.track.trackId,
          match: r.match,
        })),
      };
    }
    return result;
  });

  wrap(lastfm, 'getSimilarTracks', async (original, artist, title, ...rest) => {
    const similar = await original(artist, title, ...rest);
    const run = currentRun();
    if (run) {
      modeRecord(run, currentMode()).similar.push({
        artist,
        title,
        count: similar.length,
      });
    }
    return similar;
  });

  wrap(itunes, 'resolveTrack', async (original, query) => {
    const track = await original(query);
    const run = currentRun();
    if (run) {
      modeRecord(run, currentMode()).resolveCalls.push({
        artist: query.artist,
        title: query.title,
        trackId: track?.trackId ?? null,
      });
    }
    return track;
  });
}

/** Nest 로거 대체 — 요청 중 로그는 run.logs 에도 남긴다 */
function createProbeLogger({ echo }) {
  const write =
    (level) =>
    (message, ...rest) => {
      const context = typeof rest.at(-1) === 'string' ? rest.at(-1) : undefined;
      const run = currentRun();
      const text =
        typeof message === 'string' ? message : JSON.stringify(message);
      if (run) run.logs.push({ level, context, message: text });
      if (echo || level === 'error' || level === 'warn') {
        console.log(`  [${level}]${context ? ` ${context}:` : ''} ${text}`);
      }
    };
  return {
    log: write('log'),
    error: write('error'),
    warn: write('warn'),
    debug: write('debug'),
    verbose: write('verbose'),
    fatal: write('fatal'),
  };
}

module.exports = {
  als,
  createRun,
  installAxiosProbe,
  installBaselineHooks,
  createProbeLogger,
};
