/**
 * 응답 시간 하네스 (M3) — 질문은 하나: "사용자가 첫 곡을 언제 보나, 전체는 언제 끝나나, 그동안 외부 호출은 몇 번인가"
 *
 * 실제 서버를 HTTP로 부른다. 바꾸려는 것이 전송 방식(SSE → 스트리밍)이라 서비스를 직접 부르는 프로세스 내 하네스로는 못 잰다.
 * - 서버는 하네스가 직접 띄우고 끈다 → 실행마다 캐시가 빈 상태에서 시작하고, 서버 로그([timing]·[serve])도 바로 읽는다
 * - 외부 호출(iTunes·OpenAI)은 서버에 net-tap.cjs를 끼워 기록한다 → 운영 코드는 그대로
 * - 전·후 비교는 빌드를 얼려(freeze) 두고, 얼린 서버와 새 서버를 같은 시간대에 번갈아 부른다 (LLM 속도의 시간대 변동 상쇄)
 *
 * 실행 (apps/backend 에서):
 *   node scripts/eval/probe-latency.cjs freeze --as baseline                      # 지금 빌드를 .measure/baseline/dist 로 얼림
 *   node scripts/eval/probe-latency.cjs run --label latency-base --servers baseline:sse --limit 6
 *   node scripts/eval/probe-latency.cjs run --label latency-ab --servers baseline:sse,current:stream
 *   node scripts/eval/probe-latency.cjs summary --label latency-ab               # 결과 폴더에서 summary.md 다시 쓰기
 * 서버 지정: 이름:전송 — 이름은 current(apps/backend/dist) 또는 freeze로 얼린 이름, 전송은 sse | post
 * 옵션: --interval <초>(앞 요청이 끝난 뒤 다음 요청까지 쉼, 기본 120 — iTunes 차단 회복) --limit <n> --ids a,b
 *       --inputs <파일>(repo 루트 기준, 기본 docs/measurements/eval/inputs.json) --mock(키·네트워크 없이 자체 검증)
 *       --allow-dirty(freeze: 커밋 안 된 변경이 있어도 얼림 — frozen.json에 dirty로 남는다)
 * 결과: docs/measurements/<날짜>-<label>/ meta.json · raw.jsonl(요청 한 줄씩) · summary.md
 * API 키는 서버가 ConfigModule로 apps/backend/.env 에서 읽는다 — 하네스는 env 파일을 열지 않는다. 실제 실행은 사용자가 한다.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const BACKEND = path.resolve(__dirname, '../..');
const REPO = path.resolve(BACKEND, '../..');
const MEASUREMENTS = path.join(REPO, 'docs/measurements');
const DEFAULT_INPUTS = 'docs/measurements/eval/inputs.json';
const FROZEN_ROOT = path.join(BACKEND, '.measure'); // 그 아래 dist 폴더는 .gitignore의 dist 규칙으로 무시된다
const TAP = path.join(__dirname, 'net-tap.cjs');
const MOCK = path.join(__dirname, 'net-mock.cjs');

/** 합격 기준 (👤 11/4, eval README "합격 기준") — 둘 다 p50 */
const PASS = { firstSongMs: 2500, completeMs: 8000 };
const TRANSPORTS = ['sse', 'post']; // stream(POST 스트리밍)은 4일차에 전송 형식이 정해지면 추가
const SHUFFLE_SEED = 20261110; // 입력 순서를 고정 시드로 섞는다 (eval README 조건)
const REQUEST_TIMEOUT_MS = 90_000;
const SERVER_START_TIMEOUT_MS = 30_000;
const ANSI = /\x1b\[[0-9;]*m/g;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => console.log(`[latency] ${message}`);

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** git 명령 결과 — git 저장소가 아니면(스크래치 사본 등) null */
function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {
    command,
    interval: 120,
    mock: false,
    allowDirty: false,
    inputs: DEFAULT_INPUTS,
  };
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i];
    const next = () => {
      const value = rest[++i];
      if (value === undefined) throw new Error(`${key} 값이 없음`);
      return value;
    };
    if (key === '--label') args.label = next();
    else if (key === '--servers') args.servers = next().split(',');
    else if (key === '--interval') args.interval = Number(next());
    else if (key === '--limit') args.limit = Number(next());
    else if (key === '--ids') args.ids = next().split(',');
    else if (key === '--inputs') args.inputs = next();
    else if (key === '--as') args.as = next();
    else if (key === '--mock') args.mock = true;
    else if (key === '--allow-dirty') args.allowDirty = true;
    else throw new Error(`알 수 없는 옵션: ${key}`);
  }
  if (!['freeze', 'run', 'summary'].includes(command))
    throw new Error('명령: freeze | run | summary');
  if (command === 'freeze' && !/^[\w-]+$/.test(args.as ?? ''))
    throw new Error('freeze --as <이름> (영문·숫자·-·_)');
  if (command === 'freeze' && args.as === 'current')
    throw new Error('current는 지금 빌드를 가리키는 이름이라 쓸 수 없음');
  if (command !== 'freeze' && !/^[\w-]+$/.test(args.label ?? ''))
    throw new Error('--label 은 영문·숫자·-·_ 로 지정');
  if (command === 'run' && !args.servers?.length)
    throw new Error('--servers 이름:전송[,이름:전송] 필요');
  if (!(args.interval >= 0)) throw new Error('--interval 은 0 이상의 초');
  return args;
}

// ── freeze: 지금 빌드를 이름 붙여 보관 ──

function freeze(args) {
  const changes = git([
    'status',
    '--porcelain',
    '--',
    'apps/backend/src',
    'packages',
  ]);
  if (changes === null && !args.allowDirty)
    throw new Error(
      'git 저장소가 아님 — 커밋을 확인할 수 없어 얼리지 않음 (--allow-dirty로 강제)',
    );
  if (changes && !args.allowDirty)
    throw new Error(
      'apps/backend/src·packages에 커밋 안 된 변경이 있음 — 얼린 빌드가 어느 커밋인지 남기려면 커밋 뒤에 얼린다',
    );

  log('빌드 중 (npm run build)…');
  execFileSync('npm', ['run', 'build'], { cwd: BACKEND, stdio: 'inherit' });

  const target = path.join(FROZEN_ROOT, args.as, 'dist');
  fs.rmSync(path.dirname(target), { recursive: true, force: true });
  fs.cpSync(path.join(BACKEND, 'dist'), target, { recursive: true });
  const frozen = {
    name: args.as,
    commit: git(['rev-parse', '--short', 'HEAD']),
    dirty: Boolean(changes) || changes === null,
    frozenAt: new Date().toISOString(),
    node: process.version,
  };
  fs.writeFileSync(
    path.join(target, 'frozen.json'),
    `${JSON.stringify(frozen, null, 2)}\n`,
  );
  log(
    `얼림: ${path.relative(REPO, target)} (커밋 ${frozen.commit ?? '알 수 없음'}${frozen.dirty ? ', 커밋 안 된 변경 포함' : ''})`,
  );
}

// ── 입력 ──

/** 기본 12개: 감정 순서대로 명확·애매를 번갈아 → 12감정이 한 번씩, 명확 6 · 애매 6 (문맥 함정 2개는 뺀다) */
function defaultSet(inputs) {
  const emotionOf = (input) => input.id.split('-')[0];
  const emotions = [
    ...new Set(inputs.filter((x) => x.kind !== 'context').map(emotionOf)),
  ];
  return emotions
    .map((emotion, k) =>
      inputs.find(
        (x) =>
          emotionOf(x) === emotion &&
          x.kind === (k % 2 === 0 ? 'clear' : 'ambiguous'),
      ),
    )
    .filter(Boolean);
}

/** 고정 시드 섞기 (mulberry32 + Fisher–Yates) */
function shuffled(items, seed) {
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function selectInputs(args) {
  const file = path.resolve(REPO, args.inputs);
  const raw = fs.readFileSync(file, 'utf8');
  const { inputs } = JSON.parse(raw);
  let chosen;
  if (args.ids) {
    chosen = args.ids.map(
      (id) =>
        inputs.find((x) => x.id === id) ??
        (() => {
          throw new Error(`입력 id 없음: ${id}`);
        })(),
    );
  } else {
    // 기본 12개 규칙은 기본 입력 파일에만 — 다른 파일(홀드아웃 등)은 전부 쓴다
    chosen = shuffled(
      args.inputs === DEFAULT_INPUTS ? defaultSet(inputs) : inputs,
      SHUFFLE_SEED,
    );
  }
  if (args.limit) chosen = chosen.slice(0, args.limit);
  return {
    file: path.relative(REPO, file),
    sha1: createHash('sha1').update(raw).digest('hex').slice(0, 12),
    inputs: chosen,
  };
}

// ── 서버 ──

function parseServer(spec) {
  const [name, transport] = spec.split(':');
  if (!TRANSPORTS.includes(transport)) {
    throw new Error(
      `전송 ${transport ?? '(없음)'} — 지금은 ${TRANSPORTS.join(' | ')} (stream은 4일차 형식이 정해지면 추가)`,
    );
  }
  const dist =
    name === 'current'
      ? path.join(BACKEND, 'dist')
      : path.join(FROZEN_ROOT, name, 'dist');
  if (!fs.existsSync(path.join(dist, 'main.js'))) {
    throw new Error(
      name === 'current'
        ? 'dist 없음 — 먼저 npm run build'
        : `얼린 빌드 없음: ${name} — 먼저 freeze --as ${name}`,
    );
  }
  const frozenFile = path.join(dist, 'frozen.json');
  const frozen = fs.existsSync(frozenFile)
    ? JSON.parse(fs.readFileSync(frozenFile, 'utf8'))
    : null;
  return { name, transport, dist, frozen };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** 스트림을 줄 단위로 넘긴다 */
function onLines(stream, callback) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      callback(buffer.slice(0, index));
      buffer = buffer.slice(index + 1);
    }
  });
}

async function startServer(server, args) {
  const port = await freePort();
  // 실제 실행은 apps/backend에서 띄워 서버가 그곳의 .env를 읽는다.
  // 모의 실행은 .env가 없는 빈 폴더에서 띄워 실제 키를 아예 읽지 않는다 (ConfigModule은 실행 폴더의 .env를 읽는다)
  const cwd = args.mock
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'artune-latency-'))
    : BACKEND;
  const env = { ...process.env, PORT: String(port), NO_COLOR: '1' };
  if (args.mock) env.OPENAI_API_KEY = 'mock-key';
  const preload = ['-r', TAP, ...(args.mock ? ['-r', MOCK] : [])];
  const child = spawn(
    process.execPath,
    [...preload, path.join(server.dist, 'main.js')],
    { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const proc = {
    ...server,
    port,
    child,
    base: `http://127.0.0.1:${port}`,
    calls: [],
    logs: [],
  };
  const take = (line) => {
    const clean = line.replace(ANSI, '');
    if (clean.startsWith('[net-tap] ')) {
      try {
        proc.calls.push(JSON.parse(clean.slice('[net-tap] '.length)));
      } catch {
        proc.logs.push({ t: Date.now(), line: clean });
      }
    } else proc.logs.push({ t: Date.now(), line: clean });
  };
  onLines(child.stdout, take);
  onLines(child.stderr, take);

  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (!proc.logs.some((l) => l.line.includes('[Server] Running on port'))) {
    if (child.exitCode !== null || Date.now() > deadline) {
      child.kill('SIGKILL');
      const tail = proc.logs
        .slice(-15)
        .map((l) => `  ${l.line}`)
        .join('\n');
      throw new Error(
        `서버 ${server.name} 시작 실패${child.exitCode !== null ? ` (종료 코드 ${child.exitCode})` : ' (시간 초과)'}\n${tail}`,
      );
    }
    await sleep(100);
  }
  log(
    `서버 ${server.name} 시작 (포트 ${port}, ${server.frozen ? `얼린 빌드 ${server.frozen.commit ?? '?'}` : '지금 빌드'})`,
  );
  return proc;
}

async function stopServer(proc) {
  if (proc.child.exitCode !== null) return;
  const exited = new Promise((resolve) => proc.child.once('exit', resolve));
  proc.child.kill('SIGTERM');
  const timeout = sleep(5000).then(() => 'timeout');
  if ((await Promise.race([exited, timeout])) === 'timeout')
    proc.child.kill('SIGKILL');
}

// ── 요청 ──

const countTracks = (response) =>
  (response?.playlists?.immerse?.tracks?.length ?? 0) +
  (response?.playlists?.soothe?.tracks?.length ?? 0);

/**
 * 요청마다 다른 사용자로 보이게 하는 헤더 — 서버의 요청 제한(IP당 분당 5회)은 X-Real-IP로 센다.
 * 120초 간격이면 걸리지 않지만, 짧은 간격으로 시험할 때 429로 결과가 오염되지 않게 한다
 */
let requestCount = 0;
const clientHeaders = () => {
  requestCount += 1;
  return {
    'X-Real-IP': `10.77.${Math.floor(requestCount / 250)}.${(requestCount % 250) + 1}`,
  };
};

/** 지금 운영 경로: GET SSE. 곡은 complete 이벤트에만 실려 오므로 첫 곡 = 완료 시점 */
async function viaSse(proc, text, t0) {
  const url = `${proc.base}/api/emotion/analyze-stream?${new URLSearchParams({ text })}`;
  const res = await fetch(url, {
    headers: { Accept: 'text/event-stream', ...clientHeaders() },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const out = { progress: [] };
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const data = frame
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (!data) continue;
      const event = JSON.parse(data);
      const t = Date.now();
      if (event.type === 'progress')
        out.progress.push({ ms: t - t0, value: event.progress });
      if (out.tFirstSong == null && countTracks(event.data) > 0)
        out.tFirstSong = t;
      if (event.type === 'error')
        throw new Error(`error 이벤트: ${event.message}`);
      if (event.type === 'complete')
        return { ...out, tComplete: t, response: event.data };
    }
  }
  throw new Error('complete 이벤트 없이 스트림이 끝남');
}

/** 한 번에 받는 POST /analyze — 응답이 다 와야 곡이 보인다 */
async function viaPost(proc, text) {
  const res = await fetch(`${proc.base}/api/emotion/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientHeaders() },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const response = await res.json();
  const t = Date.now();
  return {
    progress: [],
    tComplete: t,
    tFirstSong: countTracks(response) > 0 ? t : null,
    response,
  };
}

function summarizeCalls(calls) {
  const itunes = calls.filter((c) => c.host === 'itunes.apple.com');
  const openai = calls.filter((c) => c.host === 'api.openai.com');
  const first = openai[0];
  return {
    itunes: {
      calls: itunes.length,
      blocked: itunes.filter((c) => c.status === 403 || c.status === 429)
        .length,
      errors: itunes.filter((c) => c.error || c.status >= 500).length,
      search: itunes.filter((c) => c.path === '/search').length,
      lookup: itunes.filter((c) => c.path === '/lookup').length,
    },
    openai: {
      calls: openai.length,
      ms: first?.tEnd != null ? first.tEnd - first.t0 : null,
      headMs: first?.tHead != null ? first.tHead - first.t0 : null,
    },
    otherHosts: [
      ...new Set(
        calls
          .map((c) => c.host)
          .filter((h) => h !== 'itunes.apple.com' && h !== 'api.openai.com'),
      ),
    ],
  };
}

/** [timing] total=…ms openai=…ms parallel_block=…ms tracks=a/b seen=x/y */
function parseTiming(lines) {
  const line = lines.find((l) => l.includes('[timing]'));
  const m = line?.match(
    /total=(\d+)ms openai=(\d+)ms parallel_block=(\d+)ms tracks=(\d+)\/(\d+)/,
  );
  return m
    ? {
        totalMs: +m[1],
        openaiMs: +m[2],
        parallelMs: +m[3],
        tracks: [+m[4], +m[5]],
      }
    : null;
}

async function measureOne(proc, input, index) {
  const t0 = Date.now();
  const row = {
    index,
    id: input.id,
    kind: input.kind,
    server: proc.name,
    transport: proc.transport,
    startedAt: new Date(t0).toISOString(),
  };
  let result;
  try {
    result =
      proc.transport === 'sse'
        ? await viaSse(proc, input.text, t0)
        : await viaPost(proc, input.text);
  } catch (error) {
    result = { error: error.message };
  }
  const t1 = Date.now();
  await sleep(300); // 마지막 net-tap 줄·서버 로그가 파이프로 도착할 여유

  row.status = result.error ? 'error' : 'ok';
  if (result.error) row.error = result.error;
  row.firstSongMs = result.tFirstSong != null ? result.tFirstSong - t0 : null;
  row.completeMs = result.tComplete != null ? result.tComplete - t0 : null;
  row.emotionLabel = result.response?.emotionLabel ?? null;
  row.crisis = result.response?.crisis ?? null;
  row.tracks = {
    immerse: result.response?.playlists?.immerse?.tracks?.length ?? 0,
    soothe: result.response?.playlists?.soothe?.tracks?.length ?? 0,
  };
  row.progress = result.progress ?? [];
  // 요청은 한 번에 하나씩이라, 이 서버에서 이 요청 시간 안에 시작된 외부 호출은 모두 이 요청 것이다
  Object.assign(
    row,
    summarizeCalls(proc.calls.filter((c) => c.t0 >= t0 && c.t0 <= t1)),
  );
  const lines = proc.logs
    .filter((l) => l.t >= t0 && l.t <= t1 + 300)
    .map((l) => l.line);
  row.serverTiming = parseTiming(lines);
  row.serverLog = lines.filter(
    (l) => /\[(timing|serve|mode-separation)\]/.test(l) || /error/i.test(l),
  );
  return row;
}

const seconds = (ms) => {
  if (ms == null) return '—';
  const value = Math.round(ms / 10) / 100;
  return `${(value === 0 ? 0 : value).toFixed(2)}s`; // -0.00s 방지
};

async function run(args) {
  const servers = args.servers.map(parseServer);
  if (new Set(servers.map((s) => s.name)).size !== servers.length)
    throw new Error('같은 서버 이름을 두 번 지정함');
  const selection = selectInputs(args);
  const outDir = path.join(MEASUREMENTS, `${today()}-${args.label}`);
  if (fs.existsSync(outDir))
    throw new Error(
      `이미 있는 결과 폴더: ${path.relative(REPO, outDir)} — 다른 --label 로`,
    );
  fs.mkdirSync(outDir, { recursive: true });

  const meta = {
    harness: 'probe-latency',
    startedAt: new Date().toISOString(),
    commit: git(['rev-parse', '--short', 'HEAD']),
    dirty: Boolean(
      git(['status', '--porcelain', '--', 'apps/backend', 'packages']),
    ),
    node: process.version,
    mock: args.mock,
    intervalSec: args.interval,
    inputs: {
      file: selection.file,
      sha1: selection.sha1,
      seed: args.ids ? null : SHUFFLE_SEED,
      ids: selection.inputs.map((x) => x.id),
    },
    servers: servers.map(({ name, transport, dist, frozen }) => ({
      name,
      transport,
      dist: path.relative(REPO, dist),
      frozen,
    })),
    order:
      servers.length > 1
        ? '입력마다 서버 순서를 번갈아 (짝수 번째 입력은 지정 순서, 홀수 번째는 반대)'
        : null,
    pass: PASS,
  };
  const metaFile = path.join(outDir, 'meta.json');
  const rawFile = path.join(outDir, 'raw.jsonl');
  fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);

  const total = selection.inputs.length * servers.length;
  const minutes = Math.ceil(((total - 1) * args.interval) / 60);
  log(
    `입력 ${selection.inputs.length}개 × 서버 ${servers.length}개 = 요청 ${total}회, 요청 사이 ${args.interval}초 → 최소 ${minutes}분`,
  );

  const procs = [];
  const stopAll = () => Promise.all(procs.map(stopServer));
  process.once('SIGINT', () => {
    log(
      '중단 — 서버를 끄고 나갑니다 (지금까지의 요청은 raw.jsonl에 남아 있음)',
    );
    stopAll().finally(() => process.exit(130));
  });

  try {
    for (const server of servers) procs.push(await startServer(server, args));
    let lastEnd = null;
    let done = 0;
    for (const [index, input] of selection.inputs.entries()) {
      const order = index % 2 === 0 ? procs : [...procs].reverse();
      for (const proc of order) {
        const wait =
          lastEnd == null ? 0 : lastEnd + args.interval * 1000 - Date.now();
        if (wait > 0) await sleep(wait);
        const row = await measureOne(proc, input, index);
        lastEnd = Date.now();
        done += 1;
        fs.appendFileSync(rawFile, `${JSON.stringify(row)}\n`);
        log(
          `${done}/${total} ${row.id} @${row.server}: ${row.status === 'ok' ? '' : `실패(${row.error}) `}` +
            `첫 곡 ${seconds(row.firstSongMs)} · 전체 ${seconds(row.completeMs)} · OpenAI ${seconds(row.openai.ms)} · ` +
            `iTunes ${row.itunes.calls}회(차단 ${row.itunes.blocked}) · 곡 ${row.tracks.immerse}/${row.tracks.soothe}`,
        );
      }
    }
  } finally {
    await stopAll();
  }
  meta.finishedAt = new Date().toISOString();
  fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  writeSummary(outDir);
}

// ── 요약 ──

/** 분위수 (선형 보간, 짝수 개의 p50은 가운데 두 값의 평균) */
function quantile(values, q) {
  const xs = values.filter((v) => v != null).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const pos = (xs.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}

function writeSummary(outDir) {
  const meta = JSON.parse(
    fs.readFileSync(path.join(outDir, 'meta.json'), 'utf8'),
  );
  const rawFile = path.join(outDir, 'raw.jsonl');
  const rows = fs.existsSync(rawFile)
    ? fs
        .readFileSync(rawFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
  const table = (header, body) =>
    [
      `| ${header.join(' | ')} |`,
      `| ${header.map(() => '---').join(' | ')} |`,
      ...body.map((r) => `| ${r.join(' | ')} |`),
    ].join('\n');
  const mark = (value, limit) =>
    value == null ? '—' : value <= limit ? '✅' : '❌';

  const perServer = meta.servers.map((server) => {
    const all = rows.filter((r) => r.server === server.name);
    const ok = all.filter((r) => r.status === 'ok');
    const pick = (f) => ok.map(f);
    const stat = {
      first50: quantile(
        pick((r) => r.firstSongMs),
        0.5,
      ),
      first90: quantile(
        pick((r) => r.firstSongMs),
        0.9,
      ),
      done50: quantile(
        pick((r) => r.completeMs),
        0.5,
      ),
      done90: quantile(
        pick((r) => r.completeMs),
        0.9,
      ),
      openai50: quantile(
        pick((r) => r.openai.ms),
        0.5,
      ),
      itunes50: quantile(
        pick((r) => r.itunes.calls),
        0.5,
      ),
      itunesMax: ok.length ? Math.max(...pick((r) => r.itunes.calls)) : null,
      blocked: ok.filter((r) => r.itunes.blocked > 0).length,
      fill: ok.length
        ? pick((r) => r.tracks.immerse + r.tracks.soothe).reduce(
            (a, b) => a + b,
            0,
          ) /
          (ok.length * 20)
        : null,
    };
    return { server, all, ok, stat };
  });

  const lines = [
    `# 응답 시간 — ${path.basename(outDir)}`,
    '',
    `- 실행: ${meta.startedAt}${meta.finishedAt ? ` ~ ${meta.finishedAt}` : ' (끝나지 않음)'} · 커밋 ${meta.commit ?? '?'}${meta.dirty ? ' (커밋 안 된 변경 있음)' : ''} · Node ${meta.node}${meta.mock ? ' · **모의 실행 — 수치 의미 없음**' : ''}`,
    `- 입력 ${meta.inputs.ids.length}개 (${meta.inputs.file}, sha1 ${meta.inputs.sha1}${meta.inputs.seed != null ? `, 시드 ${meta.inputs.seed}로 섞음` : ''}) · 요청 사이 ${meta.intervalSec}초 · 서버는 실행마다 새로 띄움(캐시 빈 상태에서 시작)`,
    `- 서버: ${meta.servers.map((s) => `\`${s.name}\`(${s.transport}, ${s.frozen ? `얼린 빌드 ${s.frozen.commit ?? '?'}${s.frozen.dirty ? ' dirty' : ''}` : '지금 빌드'})`).join(' · ')}${meta.order ? ` · ${meta.order}` : ''}`,
    '- 첫 곡 = 클라이언트가 곡이 담긴 첫 이벤트(응답)를 받은 시점. SSE·POST는 곡이 완료 시점에 한꺼번에 오므로 첫 곡 = 전체',
    `- 합격 기준(p50): 첫 곡 ≤ ${PASS.firstSongMs / 1000}s · 전체 ≤ ${PASS.completeMs / 1000}s`,
    '',
    '## 서버별',
    '',
    table(
      [
        '서버',
        '성공',
        '첫 곡 p50',
        '첫 곡 p90',
        '전체 p50',
        '전체 p90',
        'OpenAI p50',
        'iTunes 호출 p50 (최대)',
        '차단 난 요청',
        '곡 채움',
        '합격 (첫 곡 · 전체)',
      ],
      perServer.map(({ server, all, ok, stat }) => [
        `\`${server.name}\` ${server.transport}`,
        `${ok.length}/${all.length}`,
        seconds(stat.first50),
        seconds(stat.first90),
        seconds(stat.done50),
        seconds(stat.done90),
        seconds(stat.openai50),
        stat.itunes50 == null ? '—' : `${stat.itunes50} (${stat.itunesMax})`,
        `${stat.blocked}`,
        stat.fill == null ? '—' : `${Math.round(stat.fill * 100)}%`,
        `${mark(stat.first50, PASS.firstSongMs)} · ${mark(stat.done50, PASS.completeMs)}`,
      ]),
    ),
  ];

  if (perServer.length > 1) {
    const [base, ...others] = perServer;
    lines.push(
      '',
      '## 같은 입력끼리 비교 (기준 − 비교 대상, 양수면 비교 대상이 빠름)',
      '',
    );
    lines.push(
      table(
        [
          '기준',
          '비교 대상',
          '짝 수',
          '첫 곡 차이 p50',
          '전체 차이 p50',
          '첫 곡이 더 빠른 입력',
        ],
        others.map((other) => {
          const pairs = base.ok
            .map((a) => [a, other.ok.find((b) => b.id === a.id)])
            .filter(([, b]) => b);
          const firstDiff = pairs.map(
            ([a, b]) => a.firstSongMs - b.firstSongMs,
          );
          const doneDiff = pairs.map(([a, b]) => a.completeMs - b.completeMs);
          return [
            `\`${base.server.name}\``,
            `\`${other.server.name}\``,
            `${pairs.length}`,
            seconds(quantile(firstDiff, 0.5)),
            seconds(quantile(doneDiff, 0.5)),
            `${firstDiff.filter((d) => d > 0).length}/${pairs.length}`,
          ];
        }),
      ),
    );
  }

  lines.push(
    '',
    '## 요청별',
    '',
    table(
      [
        '#',
        '입력',
        '서버',
        '첫 곡',
        '전체',
        'OpenAI',
        'iTunes (차단)',
        '곡 심취/완화',
        '감정',
        '비고',
      ],
      rows.map((r) => [
        `${r.index + 1}`,
        r.id,
        r.server,
        seconds(r.firstSongMs),
        seconds(r.completeMs),
        seconds(r.openai?.ms),
        `${r.itunes?.calls ?? 0} (${r.itunes?.blocked ?? 0})`,
        `${r.tracks.immerse}/${r.tracks.soothe}`,
        r.emotionLabel ?? '—',
        r.status === 'ok'
          ? r.otherHosts?.length
            ? `기타 호출: ${r.otherHosts.join(', ')}`
            : ''
          : `실패: ${r.error}`,
      ]),
    ),
    '',
  );
  fs.writeFileSync(path.join(outDir, 'summary.md'), lines.join('\n'));
  log(`요약: ${path.relative(REPO, path.join(outDir, 'summary.md'))}`);
}

function summary(args) {
  const found = fs
    .readdirSync(MEASUREMENTS)
    .filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d) && d.slice(11) === args.label)
    .sort();
  if (!found.length) throw new Error(`라벨 ${args.label} 의 결과 폴더가 없음`);
  writeSummary(path.join(MEASUREMENTS, found.at(-1)));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'freeze') freeze(args);
  else if (args.command === 'run') await run(args);
  else summary(args);
}

main().catch((error) => {
  console.error(`[latency] 실패: ${error.message}`);
  process.exit(1);
});
