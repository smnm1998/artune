/**
 * 추천 품질 평가 하네스 — 조건은 docs/measurements/eval/README.md
 *
 * 서버·SSE 를 거치지 않고 빌드된 앱(dist)의 EmotionService 를 같은 프로세스에서 직접 호출한다.
 * TypeScript 가 아니라 .cjs 인 이유: tsconfig 에 include 가 없어 src 밖에 .ts 를 두면
 * 빌드 산출물 경로가 dist/main.js → dist/src/main.js 로 바뀌어 배포(start: node dist/main)가 깨진다.
 *
 * 실행 (apps/backend 에서):
 *   npm run build
 *   node scripts/eval/run.cjs --label baseline            # 실제 API, 요청 간 120초
 *   node scripts/eval/run.cjs --label smoke --mock --limit 4   # 키 없이 자체 검증
 * 옵션: --interval <초> --seed <정수> --limit <n> --out <폴더>
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const BACKEND = path.resolve(__dirname, '../..');
const REPO = path.resolve(BACKEND, '../..');
const DIST = path.join(BACKEND, 'dist');
const INPUTS = path.join(REPO, 'docs/measurements/eval/inputs.json');
const BASELINE_REF = 'e4cda32';
const APP_CODE_PATHS = [
  'apps/backend/src',
  'apps/frontend/src',
  'packages',
  'package-lock.json',
];

function parseArgs(argv) {
  const args = {
    interval: null,
    seed: 20261102,
    limit: null,
    mock: false,
    label: null,
    out: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = () => argv[++i];
    if (key === '--label') args.label = next();
    else if (key === '--interval') args.interval = Number(next());
    else if (key === '--seed') args.seed = Number(next());
    else if (key === '--limit') args.limit = Number(next());
    else if (key === '--out') args.out = next();
    else if (key === '--mock') args.mock = true;
    else throw new Error(`알 수 없는 옵션: ${key}`);
  }
  if (!args.label || !/^[\w-]+$/.test(args.label))
    throw new Error('--label 은 영문·숫자·-·_ 로 지정');
  args.interval ??= args.mock ? 0 : 120;
  return args;
}

// 고정 시드 셔플 (mulberry32 + Fisher–Yates) — 감정 순서에 따른 throttle 편향 방지
function shuffle(items, seed) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

function gitInfo() {
  const head = git(['rev-parse', '--short', 'HEAD']);
  if (head == null) return { head: null, note: 'git 저장소 아님' };
  const status = git(['status', '--porcelain']);
  let sameAsBaseline = null;
  try {
    execFileSync(
      'git',
      ['diff', '--quiet', BASELINE_REF, 'HEAD', '--', ...APP_CODE_PATHS],
      { cwd: REPO, stdio: 'ignore' },
    );
    sameAsBaseline = true;
  } catch (error) {
    sameAsBaseline = error.status === 1 ? false : null;
  }
  return {
    head,
    dirty: Boolean(status),
    dirtyFiles: status ? status.split('\n') : [],
    appCode: { baseline: BASELINE_REF, same: sameAsBaseline },
  };
}

/** dist 가 src 보다 오래됐으면 측정 대상이 기록과 어긋나므로 중단 */
function assertFreshBuild() {
  if (!fs.existsSync(path.join(DIST, 'main.js'))) {
    throw new Error('dist 없음 — 먼저 npm run build');
  }
  const files = (dir, ext) =>
    fs
      .readdirSync(dir, { recursive: true })
      .filter((f) => f.endsWith(ext))
      .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }));
  // incremental 빌드는 바뀐 파일만 다시 쓰므로 main.js 하나가 아니라 dist 전체의 최신 시각과 비교
  const builtAt = Math.max(...files(DIST, '.js').map((x) => x.mtime));
  const stale = files(path.join(BACKEND, 'src'), '.ts').find(
    (x) => x.mtime > builtAt,
  )?.f;
  if (stale)
    throw new Error(
      `dist 가 소스보다 오래됨 (src/${stale}) — npm run build 후 다시 실행`,
    );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 간격 대기 — 1초 단위로 나눠 중단 요청에 바로 반응 */
async function waitInterval(seconds, shouldStop) {
  for (let i = 0; i < seconds && !shouldStop(); i++) await sleep(1000);
}

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD (로컬 날짜)

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertFreshBuild();

  const outDir = path.resolve(
    args.out ??
      path.join(REPO, 'docs/measurements', `${today()}-${args.label}`),
  );
  if (fs.existsSync(path.join(outDir, 'raw.jsonl')))
    throw new Error(`이미 결과가 있음: ${outDir} (덮어쓰지 않음)`);
  const gitState = gitInfo(); // 산출물 폴더를 만들기 전에 기록해야 dirty 판정에 섞이지 않음

  const { inputs } = JSON.parse(fs.readFileSync(INPUTS, 'utf8'));
  const order = [
    ...shuffle(inputs, args.seed).map((input) => ({ input, pass: 1 })),
    ...shuffle(
      inputs.filter((i) => i.repeat),
      args.seed + 1,
    ).map((input) => ({ input, pass: 2 })),
  ].slice(0, args.limit ?? undefined);

  const axios = require('axios');
  if (args.mock) {
    process.env.OPENAI_API_KEY = 'mock-key';
    process.env.LASTFM_API_KEY = 'mock-key';
    axios.defaults.adapter = require('./mock-adapter.cjs').mockAdapter;
  }
  const {
    als,
    createRun,
    installAxiosProbe,
    installBaselineHooks,
    createProbeLogger,
  } = require('./instrument.cjs');
  installAxiosProbe(axios);

  // ConfigModule 이 envFilePath '.env' 를 cwd 기준으로 읽으므로 앱과 같은 위치에서 부팅.
  // 모의 모드는 .env 가 없는 빈 임시 폴더에서 부팅해 실제 키를 아예 읽지 않는다
  process.chdir(
    args.mock
      ? fs.mkdtempSync(path.join(os.tmpdir(), 'artune-eval-'))
      : BACKEND,
  );
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(path.join(DIST, 'app.module'));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: createProbeLogger({ echo: false }),
  });
  const get = (rel, name) =>
    app.get(require(path.join(DIST, rel))[name], { strict: false });
  const emotion = get('emotion/emotion.service', 'EmotionService');
  installBaselineHooks({
    openai: get('openai/openai.service', 'OpenAIService'),
    music: get('music/music.service', 'MusicService'),
    lastfm: get('lastfm/lastfm.service', 'LastfmService'),
    itunes: get('itunes/itunes.service', 'ITunesService'),
  });

  fs.mkdirSync(outDir, { recursive: true });
  const meta = {
    label: args.label,
    status: 'running',
    startedAt: new Date().toISOString(),
    endedAt: null,
    git: gitState,
    node: process.version,
    harness: {
      interval: args.interval,
      seed: args.seed,
      mock: args.mock,
      limit: args.limit,
      runs: order.length,
      order: order.map((o) => `${o.input.id}#${o.pass}`),
    },
    models: [],
  };
  const writeMeta = () =>
    fs.writeFileSync(
      path.join(outDir, 'meta.json'),
      `${JSON.stringify(meta, null, 2)}\n`,
    );
  writeMeta();

  let stopRequested = false;
  process.on('SIGINT', () => {
    if (stopRequested) process.exit(130);
    stopRequested = true;
    console.log(
      '\n중단 요청 — 현재 요청까지 기록하고 멈춥니다 (한 번 더 누르면 즉시 종료)',
    );
  });

  const models = new Set();
  console.log(
    `[eval] ${order.length}회 실행 → ${path.relative(REPO, outDir)} (간격 ${args.interval}초${args.mock ? ', 모의' : ''})`,
  );

  for (const [index, { input, pass }] of order.entries()) {
    if (stopRequested) break;
    const run = createRun();
    const startedAt = new Date().toISOString();
    const start = performance.now();
    let error = null;
    try {
      await als.run({ run }, () => emotion.analyzeAndRecommend(input.text));
    } catch (e) {
      error = String(e?.message ?? e);
    }
    const ms = Math.round(performance.now() - start);
    run.http.forEach((h) => h.model && models.add(h.model));

    const line = {
      seq: index + 1,
      id: input.id,
      kind: input.kind,
      expected: input.expected,
      pass,
      text: input.text,
      startedAt,
      ms,
      error,
      ...run,
    };
    fs.appendFileSync(
      path.join(outDir, 'raw.jsonl'),
      `${JSON.stringify(line)}\n`,
    );

    const itunes = run.http.filter((h) => h.host === 'itunes.apple.com');
    const throttled = itunes.filter(
      (h) => h.status === 403 || h.status === 429,
    ).length;
    console.log(
      `[${index + 1}/${order.length}] ${input.id}#${pass} ${(ms / 1000).toFixed(1)}s ` +
        `emotion=${run.llm?.output?.emotion ?? '-'} tracks=${run.modes.immerse?.tracks.length ?? 0}/${run.modes.soothe?.tracks.length ?? 0} ` +
        `itunes=${itunes.length} throttle=${throttled}${error ? ` ERROR ${error}` : ''}`,
    );

    if (index < order.length - 1)
      await waitInterval(args.interval, () => stopRequested);
  }

  meta.status = stopRequested ? 'aborted' : 'done';
  meta.endedAt = new Date().toISOString();
  meta.models = [...models];
  writeMeta();
  await app.close();
  console.log(
    `[eval] ${meta.status}. 요약: node scripts/eval/summarize.cjs ${path.relative(BACKEND, outDir)}`,
  );
}

main().catch((error) => {
  console.error(`[eval] 실패: ${error.message}`);
  process.exit(1);
});
