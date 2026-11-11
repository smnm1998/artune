/**
 * LLM 직접 선곡 프로브 — "AI가 최종곡을 직접 고르고, 해석(실존 확인)은 클라이언트가 한다" 설계의 가능성 판정.
 * 7/22 A안(직접 선곡)의 낮은 해석률이 LLM 환각 때문인지 iTunes throttle 때문인지 분리하려고,
 * 선곡(pick)과 해석(resolve)을 나눠 해석은 분당 호출 수를 제한해 천천히 돌린다.
 *
 * 실행 (apps/backend 에서, 먼저 npm run build — 프롬프트·스키마와 해석기 모두 운영 빌드를 그대로 쓴다):
 *   node scripts/eval/probe-picks.cjs pick    --label pick-probe   # 변형·모델별 선곡 (OpenAI만, 수 분)
 *   node scripts/eval/probe-picks.cjs resolve --label pick-probe   # iTunes 해석 (분당 15회, 이어서 실행 가능)
 *   node scripts/eval/probe-picks.cjs summary --label pick-probe
 * 옵션: --per-minute <n>  --limit <입력 수>  --out <폴더>  --mock(키·네트워크 없이 자체 검증)
 *       --inputs <파일>(repo 루트 기준, 기본 docs/measurements/eval/inputs.json — 홀드아웃 입력 등)
 *       --variants V3,V5(src/openai/pick-prompt.ts 의 PICK_VARIANTS, 기본 = 운영 변형 PRODUCTION_PICK_VARIANT)
 *       --models(MODELS에 있는 것만 — 지금은 운영 모델 하나)
 * 11/2·11/3 결과(변형 표기 없음)는 이 파일에 있던 프롬프트(promptSha1 eb886af1b088)로 잰 것 = V0에서 위기·공감 문구 규칙을 뺀 것.
 * 그때의 모델 비교(gpt-4.1-mini · gpt-6.1-terra)와 --reasoning 옵션은 11/11에 걷었다 — 다시 재려면 커밋 b0e6760을 체크아웃
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const BACKEND = path.resolve(__dirname, '../..');
const REPO = path.resolve(BACKEND, '../..');
const DIST = path.join(BACKEND, 'dist');
const INPUTS = path.join(REPO, 'docs/measurements/eval/inputs.json');

const REGIONS = ['korea', 'pop', 'jpop'];

// 모델별 요청 파라미터 — 운영과 같게(src/openai/openai.service.ts: luna, 추론 끔)
const MODELS = {
  'gpt-6-luna': { reasoning_effort: 'none' },
};

/** 운영 빌드의 선곡 프롬프트·스키마 (src/openai/pick-prompt.ts) — 잰 프롬프트가 곧 배포하는 프롬프트 */
function loadPickPrompt() {
  const file = path.join(DIST, 'openai/pick-prompt.js');
  if (!fs.existsSync(file)) throw new Error('dist 없음 — 먼저 npm run build');
  return require(file);
}

// 같은 입력이라도 변형·모델이 다르면 다른 실행이다 (11/2·11/3 기록은 변형 표기가 없어 A0)
const groupOf = (r) => `${r.variant ?? 'A0'} ${r.model}`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {
    command,
    label: null,
    models: Object.keys(MODELS),
    perMinute: null,
    limit: null,
    out: null,
    inputs: INPUTS,
    variants: null, // pick에서 운영 변형으로 채운다(빌드를 읽어야 알 수 있음)
    mock: false,
  };
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i];
    const next = () => rest[++i];
    if (key === '--label') args.label = next();
    else if (key === '--models') args.models = next().split(',');
    else if (key === '--per-minute') args.perMinute = Number(next());
    else if (key === '--limit') args.limit = Number(next());
    else if (key === '--out') args.out = next();
    else if (key === '--inputs') args.inputs = path.resolve(REPO, next());
    else if (key === '--variants') args.variants = next().split(',');
    else if (key === '--mock') args.mock = true;
    else throw new Error(`알 수 없는 옵션: ${key}`);
  }
  if (!['pick', 'resolve', 'summary'].includes(command))
    throw new Error('명령: pick | resolve | summary');
  if (!args.label || !/^[\w-]+$/.test(args.label))
    throw new Error('--label 은 영문·숫자·-·_ 로 지정');
  const unknown = args.models.filter((m) => !MODELS[m]);
  if (unknown.length)
    throw new Error(`MODELS 에 없는 모델: ${unknown.join(', ')}`);
  args.perMinute ??= args.mock ? 60000 : 15;
  return args;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (artist, title) => `${artist}|${title}`.toLowerCase();
const today = () => new Date().toLocaleDateString('sv-SE');
const readJsonl = (file) =>
  fs.existsSync(file)
    ? fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

/** 모의 OpenAI: 공백 없는 아티스트 토큰으로 선곡 (모의 iTunes 가 검색어를 다시 나눌 수 있게) */
function mockPicks(config) {
  const body = JSON.parse(config.data);
  const text = body.messages.at(-1).content;
  let h = 0;
  for (const ch of text + body.model) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  // 시스템 프롬프트로 변형을 찾아 그 변형의 모드별 곡 수만큼 고른다 (V5는 완화 15곡)
  const { PICK_VARIANTS, buildPickPrompt, picksPerMode } = loadPickPrompt();
  const counts = picksPerMode(
    Object.values(PICK_VARIANTS).find(
      (options) => buildPickPrompt(options) === body.messages[0].content,
    ),
  );
  const list = (mode, perRegion) =>
    REGIONS.flatMap((region) =>
      Array.from({ length: perRegion[region] }, (_, i) => ({
        artist: `${region}${mode}${(h + i) % 9}`,
        title: `${mode} ${region} song ${i}`,
        region,
      })),
    );
  const { properties } = body.response_format.json_schema.schema;
  const content = {
    emotion: properties.emotion.enum[h % properties.emotion.enum.length],
    crisis: false,
    description: '모의 응답',
    ...('reading' in properties && {
      reading: '모의 해석',
      targets: { immerse: 'mock', soothe: 'mock' },
    }),
    immerse: list('im', counts.immerse),
    soothe: list('so', counts.soothe),
  };
  return {
    data: {
      choices: [
        {
          finish_reason: 'stop',
          message: { content: JSON.stringify(content), refusal: null },
        },
      ],
      usage: { prompt_tokens: 600, completion_tokens: 700 },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  };
}

function setupAxios(args) {
  const axios = require('axios');
  if (args.mock) {
    const { mockAdapter } = require('./mock-adapter.cjs');
    axios.defaults.adapter = (config) =>
      new URL(config.url).host === 'api.openai.com'
        ? Promise.resolve(mockPicks(config))
        : mockAdapter(config);
    process.env.OPENAI_API_KEY = 'mock-key';
  } else {
    // 키는 앱과 같은 .env 에서 프로세스로만 읽는다 (출력·기록하지 않음)
    require('dotenv').config({ path: path.join(BACKEND, '.env'), quiet: true });
    if (!process.env.OPENAI_API_KEY)
      throw new Error('OPENAI_API_KEY 없음 (apps/backend/.env)');
  }
  return axios;
}

async function pick(args, outDir) {
  const axios = setupAxios(args);
  const prompts = loadPickPrompt();
  args.variants ??= [prompts.PRODUCTION_PICK_VARIANT];
  const unknown = args.variants.filter((v) => !prompts.PICK_VARIANTS[v]);
  if (unknown.length)
    throw new Error(`PICK_VARIANTS 에 없는 변형: ${unknown.join(', ')}`);
  const { inputs } = JSON.parse(fs.readFileSync(args.inputs, 'utf8'));
  const targets = inputs.slice(0, args.limit ?? undefined);
  const file = path.join(outDir, 'picks.jsonl');
  const runKey = (r) => `${groupOf(r)}|${r.id}`;
  // 오류 난 입력은 이어 실행 때 다시 시도한다 — 오류 줄은 지우지 않고 picks.errors.jsonl 로 옮겨 남긴다
  const previous = readJsonl(file);
  const failed = previous.filter((r) => !r.output);
  if (failed.length) {
    const lines = (rs) => rs.map((r) => `${JSON.stringify(r)}\n`).join('');
    fs.appendFileSync(path.join(outDir, 'picks.errors.jsonl'), lines(failed));
    fs.writeFileSync(file, lines(previous.filter((r) => r.output)));
    console.log(
      `[pick] 오류 ${failed.length}건을 picks.errors.jsonl 로 옮기고 다시 시도`,
    );
  }
  const done = new Set(previous.filter((r) => r.output).map(runKey));
  const sha1 = (text) =>
    createHash('sha1').update(text).digest('hex').slice(0, 12);

  // 결과가 어떤 코드·프롬프트에서 나왔는지. 이어서 실행하면 처음 기록을 유지하고 새 변형·모델만 덧붙인다
  const metaFile = path.join(outDir, 'meta.json');
  const meta = fs.existsSync(metaFile)
    ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    : {
        startedAt: new Date().toISOString(),
        git: (() => {
          try {
            return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
              cwd: REPO,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'ignore'],
            }).trim();
          } catch {
            return null;
          }
        })(),
        mock: args.mock,
        models: {},
        variants: {},
        inputs: targets.length,
        inputsFile: path.relative(REPO, args.inputs),
      };
  for (const model of args.models) meta.models[model] ??= MODELS[model];
  for (const variant of args.variants)
    meta.variants[variant] ??= {
      options: prompts.PICK_VARIANTS[variant],
      promptSha1: sha1(prompts.buildPickPrompt(prompts.PICK_VARIANTS[variant])),
      // 모드별 지역 곡 수 — 변형마다 다르다 (V5는 완화 15곡)
      perMode: prompts.picksPerMode(prompts.PICK_VARIANTS[variant]),
    };
  fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);

  for (const variant of args.variants) {
    const options = prompts.PICK_VARIANTS[variant];
    const system = prompts.buildPickPrompt(options);
    const format = prompts.buildPickFormat(options);
    for (const model of args.models) {
      const params = MODELS[model];
      for (const [index, input] of targets.entries()) {
        const line = {
          variant,
          model,
          params,
          id: input.id,
          kind: input.kind,
          expected: input.expected,
          text: input.text,
        };
        if (done.has(runKey(line))) continue;
        const start = performance.now();
        try {
          const res = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: input.text },
              ],
              response_format: format,
              ...params,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              timeout: 60000,
            },
          );
          // strict 스키마 밖 결과: 거절·토큰 한도 잘림
          const choice = res.data.choices[0];
          if (choice.message.refusal)
            throw new Error(`refusal: ${choice.message.refusal}`);
          if (choice.finish_reason === 'length')
            throw new Error('finish_reason length');
          Object.assign(line, {
            ms: Math.round(performance.now() - start),
            usage: res.data.usage,
            output: JSON.parse(choice.message.content),
          });
        } catch (error) {
          const message = error.response?.data?.error?.message ?? error.message;
          Object.assign(line, {
            ms: Math.round(performance.now() - start),
            error: `${error.response?.status ?? ''} ${message}`.trim(),
          });
        }
        console.log(
          `[pick] ${groupOf(line)} ${index + 1}/${targets.length} ${input.id} ${(line.ms / 1000).toFixed(1)}s ${line.error ? `ERROR ${line.error}` : `emotion=${line.output.emotion} picks=${line.output.immerse.length}/${line.output.soothe.length}`}`,
        );
        // 첫 요청부터 실패하면 파라미터 문제일 가능성이 커서 기록하지 않고 그 모델을 건너뛴다 (같은 오류로 반복 과금되지 않게)
        if (line.error && index === 0) {
          console.log(
            `[pick] ${groupOf(line)} 첫 요청 실패 — 건너뜀. 오류를 확인한 뒤 다시 실행하면 이어서 진행`,
          );
          break;
        }
        fs.appendFileSync(file, `${JSON.stringify(line)}\n`);
      }
    }
  }
}

async function resolve(args, outDir) {
  const axios = setupAxios(args);
  if (!fs.existsSync(path.join(DIST, 'itunes/itunes.service.js')))
    throw new Error('dist 없음 — 먼저 npm run build');
  // 앱과 같은 해석 로직(US 검색 → KR·JP 표기 lookup → JP 검색, 품질 필터, 곡명·아티스트 대조)을 그대로 쓴다
  const { ITunesService } = require(path.join(DIST, 'itunes/itunes.service'));
  const memory = new Map();
  const itunes = new ITunesService({
    get: async (k) => memory.get(k),
    set: async (k, v) => void memory.set(k, v),
  });

  let calls = 0;
  let throttled = false;
  let failed = false;
  axios.interceptors.response.use(
    (res) => (calls++, res),
    (err) => {
      calls++;
      failed = true;
      if ([403, 429].includes(err.response?.status)) throttled = true;
      return Promise.reject(err);
    },
  );

  // --models 로 해석할 모델을 고를 수 있다 (오래 걸리므로 중요한 모델부터)
  const picks = readJsonl(path.join(outDir, 'picks.jsonl')).filter(
    (r) => r.output && args.models.includes(r.model),
  );
  const unique = new Map();
  for (const r of picks)
    for (const mode of ['immerse', 'soothe'])
      for (const t of r.output[mode]) unique.set(key(t.artist, t.title), t);

  const file = path.join(outDir, 'resolve.json');
  const results = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {};
  const todo = [...unique].filter(([k]) => !results[k]);
  const gapMs = 60000 / args.perMinute;
  console.log(
    `[resolve] 고유 곡 ${unique.size}개 중 남은 ${todo.length}개, 분당 ${args.perMinute}회 → 최대 약 ${Math.ceil((todo.length * 3) / args.perMinute)}분`,
  );

  // 모의 어댑터도 403 을 섞어 보내므로, 모의 모드에선 대기 단위를 분 → ms 로 줄여 경로만 검증한다
  const minuteMs = args.mock ? 1 : 60000;
  let cooldown = 5;
  let retries = 0;
  for (const [index, [k, t]] of todo.entries()) {
    for (;;) {
      const before = calls;
      throttled = false;
      failed = false;
      const track = await itunes.resolveTrack({
        artist: t.artist,
        title: t.title,
      });
      await sleep((calls - before) * gapMs);
      // 네트워크 오류(ECONNRESET 등)도 '없는 곡'이 아니다 — 해석기는 캐시하지 않고 null 을 돌려주므로 다시 시도
      if (failed && !throttled) {
        if (++retries > 5)
          throw new Error(
            '네트워크 오류가 계속됨 — 나중에 같은 명령으로 이어서 실행',
          );
        console.log(
          `[resolve] 네트워크 오류 — 30초 대기 후 재시도 ${retries}/5`,
        );
        await sleep(minuteMs / 2);
        continue;
      }
      if (!failed) {
        retries = 0;
        results[k] = track
          ? {
              found: true,
              trackId: track.trackId,
              trackName: track.trackName,
              artistName: track.artistName,
              // 화면 10곡 재현의 1아티스트 1곡 판정용 (스토어마다 표기가 달라도 같은 값)
              artistId: track.artistId ?? null,
              genre: track.primaryGenreName ?? null,
            }
          : { found: false };
        cooldown = 5;
        break;
      }
      // throttle 은 '없는 곡'이 아니다 — 기록하지 않고 쉬었다가 같은 곡을 다시 시도
      if (cooldown > 40)
        throw new Error(
          'throttle 이 계속됨 — 나중에 같은 명령으로 이어서 실행',
        );
      console.log(`[resolve] throttle — ${cooldown}분 대기 후 재시도`);
      await sleep(cooldown * minuteMs);
      cooldown *= 2;
    }
    fs.writeFileSync(file, JSON.stringify(results, null, 1));
    if ((index + 1) % 20 === 0 || index === todo.length - 1)
      console.log(`[resolve] ${index + 1}/${todo.length}`);
  }
}

async function summary(args, outDir) {
  const { DEFAULT_SONGS } = loadPickPrompt();
  const meta = JSON.parse(
    fs.readFileSync(path.join(outDir, 'meta.json'), 'utf8'),
  );
  const picks = readJsonl(path.join(outDir, 'picks.jsonl'));
  const resolveFile = path.join(outDir, 'resolve.json');
  const results = fs.existsSync(resolveFile)
    ? JSON.parse(fs.readFileSync(resolveFile, 'utf8'))
    : {};
  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}% (${n}/${d})` : '-');
  const q = (xs, p) =>
    xs.length
      ? [...xs].sort((a, b) => a - b)[
          Math.min(xs.length - 1, Math.ceil(p * xs.length) - 1)
        ]
      : NaN;
  const sec = (ms) =>
    Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : '-';
  const avg = (xs) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
  const row = (cells) =>
    `| ${cells.map((c) => String(c).replaceAll('|', '\\|')).join(' | ')} |`;
  const lines = [
    `# LLM 직접 선곡 프로브 — ${path.basename(outDir)}`,
    '',
    `- 해석 완료 ${Object.keys(results).length}곡 (고유 곡 기준), 해석 미완료 곡은 해석률 분모에서 제외`,
    '',
  ];

  const groups = [...new Set(picks.map(groupOf))];
  lines.push(
    '## 변형·모델별',
    '',
    row([
      '변형·모델',
      '감정 명확·애매',
      '문맥 함정',
      '지연 p50/p90',
      '토큰 입력/출력',
      '판정 진행',
      '해석률',
      '해석률 korea/pop/jpop',
      '모드 10곡 채움',
      '오류',
    ]),
    row(Array(10).fill('---')),
  );
  const misses = [];
  for (const group of groups) {
    const rs = picks.filter((r) => groupOf(r) === group);
    const ok = rs.filter((r) => r.output);
    const hit = (r) => r.expected.includes(r.output.emotion);
    const plain = ok.filter((r) => r.kind !== 'context');
    const ctx = ok.filter((r) => r.kind === 'context');
    const tracks = ok.flatMap((r) =>
      ['immerse', 'soothe'].flatMap((m) => r.output[m]),
    );
    const judged = tracks.filter((t) => results[key(t.artist, t.title)]);
    const found = (t) => results[key(t.artist, t.title)]?.found;
    const byRegion = REGIONS.map((g) => {
      const xs = judged.filter((t) => t.region === g);
      return pct(xs.filter(found).length, xs.length);
    });
    const modes = ok.flatMap((r) =>
      ['immerse', 'soothe'].map((m) => r.output[m]),
    );
    const fullModes = modes.filter(
      (m) =>
        m.every((t) => results[key(t.artist, t.title)]) &&
        m.filter(found).length >= 10,
    );
    const judgedModes = modes.filter((m) =>
      m.every((t) => results[key(t.artist, t.title)]),
    );
    const ms = ok.map((r) => r.ms);
    lines.push(
      row([
        group,
        pct(plain.filter(hit).length, plain.length),
        ctx
          .map((r) => `${r.id.replace('context-', '')}→${r.output.emotion}`)
          .join(', ') || '-',
        `${sec(q(ms, 0.5))} / ${sec(q(ms, 0.9))}`,
        `${Math.round(avg(ok.map((r) => r.usage?.prompt_tokens ?? NaN)))} / ${Math.round(avg(ok.map((r) => r.usage?.completion_tokens ?? NaN)))}`,
        pct(judged.length, tracks.length),
        pct(judged.filter(found).length, judged.length),
        byRegion.join(' · '),
        pct(fullModes.length, judgedModes.length),
        rs.length - ok.length,
      ]),
    );
    misses.push(
      ...judged
        .filter((t) => !found(t))
        .map((t) => [group, t.region, t.artist, t.title]),
    );
  }

  // 모드별 목표 곡 수는 그 측정의 meta.json에 기록된 값 — 운영 코드의 변형이 바뀌거나 사라져도 예전 측정을 다시 요약할 수 있다.
  // 11/6부터는 변형별 perMode(V5는 완화 15곡), 그 전 기록은 두 모드 공통 perMode(모드마다 12곡)
  const targetsOf = (r) =>
    meta.variants?.[r.variant]?.perMode ?? {
      immerse: meta.perMode,
      soothe: meta.perMode,
    };
  const total = (perRegion) =>
    Object.values(perRegion).reduce((a, b) => a + b, 0);
  const compliance = groups.map((group) => {
    const rs = picks.filter((r) => groupOf(r) === group && r.output);
    const modes = rs.flatMap((r) =>
      ['immerse', 'soothe'].map((m) => r.output[m]),
    );
    const countOk = rs.flatMap((r) =>
      ['immerse', 'soothe'].filter((m) =>
        REGIONS.every(
          (g) =>
            r.output[m].filter((t) => t.region === g).length ===
            targetsOf(r)[m][g],
        ),
      ),
    ).length;
    const length = (m) =>
      `${avg(rs.map((r) => r.output[m].length)).toFixed(1)}/${rs.length ? total(targetsOf(rs[0])[m]) : '-'}`;
    const dupArtist = modes.filter(
      (m) => new Set(m.map((t) => t.artist.toLowerCase())).size < m.length,
    ).length;
    const decorated = modes
      .flat()
      .filter((t) => /remix|live|\(\d{4}\)|ver\./i.test(t.title)).length;
    return row([
      group,
      `${length('immerse')} · ${length('soothe')}`,
      pct(countOk, modes.length),
      dupArtist,
      decorated,
    ]);
  });
  lines.push(
    '',
    '## 지시 준수',
    '',
    row([
      '변형·모델',
      '곡 수 심취 · 완화 (평균/목표)',
      '지역별 곡 수 정확',
      '아티스트 중복 모드',
      '버전·연도 표기 곡',
    ]),
    row(Array(5).fill('---')),
    ...compliance,
  );

  // 기본곡 쏠림 — 감정과 무관하게 같은 곡이 반복되는지 (R2 설계 .claude/r2-design.md)
  const songKey = (t) => key(t.artist, t.title);
  const concentration = (lists) => {
    const counts = new Map();
    for (const t of lists.flat())
      counts.set(songKey(t), (counts.get(songKey(t)) ?? 0) + 1);
    const top = [...counts.values()]
      .sort((a, b) => b - a)
      .slice(0, 20)
      .reduce((a, b) => a + b, 0);
    return `${pct(top, lists.flat().length).split(' ')[0]} · ${counts.size}곡`;
  };
  const defaults = new Set(DEFAULT_SONGS.map(songKey));
  const jaccard = (a, b) => {
    const x = new Set(a.map(songKey));
    const y = new Set(b.map(songKey));
    const both = [...x].filter((k) => y.has(k)).length;
    return both / (x.size + y.size - both || 1);
  };
  const diversity = groups.map((group) => {
    const ok = picks.filter((r) => groupOf(r) === group && r.output);
    const soothe = ok.flatMap((r) => r.output.soothe);
    // 서로 다른 감정으로 판정된 응답끼리의 완화 목록 Jaccard 평균 — 낮을수록 감정마다 완화가 다르다
    const pairs = [];
    for (let i = 0; i < ok.length; i++)
      for (let j = i + 1; j < ok.length; j++)
        if (ok[i].output.emotion !== ok[j].output.emotion)
          pairs.push(jaccard(ok[i].output.soothe, ok[j].output.soothe));
    // 곡보다 먼저 생성되는 출력 길이 — 스트리밍에서 첫 곡까지 기다리는 양의 근사
    const lead = ok.map((r) => {
      const { immerse, soothe, ...rest } = r.output;
      return JSON.stringify(rest).length;
    });
    return row([
      group,
      concentration(ok.map((r) => r.output.soothe)),
      concentration(ok.map((r) => r.output.immerse)),
      pct(soothe.filter((t) => defaults.has(songKey(t))).length, soothe.length),
      avg(pairs).toFixed(3),
      q(lead, 0.5),
    ]);
  });
  lines.push(
    '',
    '## 기본곡 쏠림·감정별 차별화',
    '',
    '- 상위 20곡 비율 · 고유 곡 수는 응답 수와 모드 곡 수가 같을 때만 비교한다 (변형마다 같은 입력, V5는 완화 15곡)',
    '- LLM이 고른 후보 기준이다. 판정은 아래 "화면 10곡" 기준으로 한다',
    '',
    row([
      '변형·모델',
      '완화 상위 20곡 · 고유',
      '심취 상위 20곡 · 고유',
      '완화 중 회피 목록 곡',
      '감정 간 완화 Jaccard',
      '곡 전 출력(문자 p50)',
    ]),
    row(Array(6).fill('---')),
    ...diversity,
  );

  // 화면 10곡 — 운영과 같은 지역 쿼터 함수(dist, 필요할 때만 해석)로 사용자가 실제로 보는 목록을 재현한다 (R2 설계 §8)
  const { selectByRegionQuotaLazily } = require(
    path.join(DIST, 'music/utils/region-quota.util'),
  );
  // 운영 곡 키(정규화한 곡명 + 8자 해시) — 위 songKey(LLM 후보 집계용 원문 키)와 다르다
  const { songKey: d3Key } = require(
    path.join(DIST, 'music/utils/song-key.util'),
  );
  const { orderByFreshness, HISTORY_LIMIT } = require(
    path.join(DIST, 'music/utils/freshness-order.util'),
  );
  const { ExposureWindow } = require(path.join(DIST, 'music/exposure-window'));
  // 선곡 순서를 점수로 넘긴다: 앞에 고른 곡부터 지역 쿼터를 채운다. isFresh를 주면 처음 보는 곡으로 먼저 채운다
  // 해석은 이미 받아 둔 resolve.json을 읽는다 — 운영이라면 그 곡에서 iTunes를 부른다
  const served = async (picked, isFresh) =>
    (
      await selectByRegionQuotaLazily(
        picked.map((t, i) => ({
          ...t,
          key: d3Key(t),
          match: picked.length - i,
        })),
        async (c) => {
          const found = results[key(c.artist, c.title)];
          return found?.found ? found : null;
        },
        { isFresh },
      )
    ).map(({ candidate, track }) => ({ ...track, key: candidate.key }));
  // D3 재생: 응답을 아래 순서대로 한 서버에 흘려 보내며 해석 전에 처음 보는 곡 → 머리 곡 → 이 사람이 본 곡으로 다시 놓는다
  // 지역에 처음 보는 곡이 모자라면 다른 지역의 처음 보는 곡 1곡까지 빌린다(FRESH_BORROW_LIMIT)
  // 전체 노출 창은 모든 응답이 함께 쓰고, 사용자 이력은 5개씩 끊은 같은 사람이 본 최근 40곡
  const replay = async (rs, mode) => {
    const exposure = new ExposureWindow();
    let history = [];
    const lists = [];
    for (const [i, r] of rs.entries()) {
      if (i % 5 === 0) history = [];
      const heads = exposure.heads(mode);
      const seen = new Set(history);
      const songs = await served(
        orderByFreshness(
          r.output[mode].map((t) => ({ ...t, key: d3Key(t) })),
          { heads, seen },
        ),
        (c) => !heads.has(c.key) && !seen.has(c.key),
      );
      const keys = songs.map((t) => t.key);
      exposure.record(mode, keys);
      history = [...history, ...keys].slice(-HISTORY_LIMIT);
      lists.push({ id: r.id, emotion: r.output.emotion, songs });
    }
    return lists;
  };
  // 같은 사람 지표는 입력 순서를 쓴다 — 재시도한 응답이 파일 끝에 붙어도 입력 파일 순서로 되돌린다
  const inputIds = (() => {
    const metaFile = path.join(outDir, 'meta.json');
    const meta = fs.existsSync(metaFile)
      ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
      : {};
    const file = meta.inputsFile && path.join(REPO, meta.inputsFile);
    return file && fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8')).inputs.map((i) => i.id)
      : [];
  })();
  const screen = [];
  for (const group of groups) {
    // 해석이 끝난 응답만. 같은 입력의 n번째 기록끼리(회차) 입력 파일 순서로 놓는다 — 입력 파일을 모르면 기록 순서
    const nth = new Map();
    const rs = picks
      .filter(
        (r) =>
          groupOf(r) === group &&
          r.output &&
          ['immerse', 'soothe'].every((m) =>
            r.output[m].every((t) => results[key(t.artist, t.title)]),
          ),
      )
      .map((r, i) => {
        const round = nth.get(r.id) ?? 0;
        nth.set(r.id, round + 1);
        const pos = inputIds.indexOf(r.id);
        return { r, round, pos: pos === -1 ? i : pos };
      })
      .sort((a, b) => a.round - b.round || a.pos - b.pos)
      .map(({ r }) => r);
    const runs = [];
    for (const mode of ['soothe', 'immerse']) {
      const plain = [];
      for (const r of rs)
        plain.push({
          id: r.id,
          emotion: r.output.emotion,
          songs: await served(r.output[mode]),
        });
      runs.push(
        { mode, order: '선곡 순서', lists: plain },
        { mode, order: 'D3 후순위', lists: await replay(rs, mode) },
      );
    }
    for (const { mode, order, lists } of runs) {
      const counts = new Map();
      const emotions = new Map();
      const names = new Map();
      for (const { emotion, songs } of lists)
        for (const t of songs) {
          counts.set(t.trackId, (counts.get(t.trackId) ?? 0) + 1);
          emotions.set(
            t.trackId,
            (emotions.get(t.trackId) ?? new Set()).add(emotion),
          );
          names.set(t.trackId, t.trackName);
        }
      const slots = lists.reduce((a, l) => a + l.songs.length, 0);
      const ranked = [...counts].sort((a, b) => b[1] - a[1]);
      const sum = (xs) => xs.reduce((a, [, n]) => a + n, 0);
      const share = (n) => (slots ? `${Math.round((n / slots) * 100)}%` : '-');
      const [firstId, firstCount] = ranked[0] ?? [];

      // 같은 입력: 같은 문장을 두 번 넣었을 때 두 화면에서 겹친 곡 수
      const byInput = Map.groupBy(lists, (l) => l.id);
      const overlaps = [...byInput.values()].flatMap((same) =>
        same.flatMap((a, i) =>
          same.slice(i + 1).map((b) => {
            const ids = new Set(a.songs.map((t) => t.trackId));
            return b.songs.filter((t) => ids.has(t.trackId)).length;
          }),
        ),
      );
      // 같은 사람: 입력 순서대로 5개씩 끊어 한 사람의 연속 사용으로 보고, 2~5번째 화면에서 앞서 본 곡 수
      const repeats = [];
      for (let s = 0; s + 5 <= lists.length; s += 5) {
        const seen = new Set();
        let again = 0;
        for (const { songs } of lists.slice(s, s + 5)) {
          again += songs.filter((t) => seen.has(t.trackId)).length;
          for (const t of songs) seen.add(t.trackId);
        }
        repeats.push(again);
      }

      screen.push(
        row([
          group,
          mode === 'soothe' ? '완화' : '심취',
          order,
          share(sum(ranked.slice(0, 20))),
          firstId == null
            ? '-'
            : `${names.get(firstId)} ${pct(firstCount, lists.length)}`,
          share(sum(ranked.filter(([id]) => emotions.get(id).size >= 6))),
          overlaps.length ? `${avg(overlaps).toFixed(1)}/10곡` : '-',
          repeats.length
            ? `${avg(repeats).toFixed(1)}/40곡 (${repeats.length}명)`
            : '-',
          pct(lists.filter((l) => l.songs.length >= 10).length, lists.length),
        ]),
      );
    }
  }
  lines.push(
    '',
    '## 화면 10곡 (판정 기준)',
    '',
    '- 해석 결과를 운영 지역 쿼터(6:3:1, 1아티스트 1곡)에 넣어 사용자가 실제로 보는 목록을 재현한다',
    '- 순서: "선곡 순서"는 LLM이 고른 순서 그대로, "D3 후순위"는 해석 전에 처음 보는 곡 → 머리 곡 → 이 사람이 본 곡으로 다시 놓고, 지역에 처음 보는 곡이 모자라면 다른 지역의 처음 보는 곡 1자리까지 빌린 것(운영에 들어갈 순서, 곡 키 = 정규화한 곡명)',
    '- D3 재생: 응답을 표의 순서대로 한 서버에 흘려 보낸다. 전체 노출 창(모드별 최근 30목록 중 15% 이상, 5목록부터)은 모든 응답이 함께 쓰고, 사용자 이력은 같은 사람(아래)이 본 최근 40곡. 실제 서버에는 다른 방문자 기록도 섞인다',
    '- 판정(D4 전 고정, D3 후순위 행으로): 완화 상위 20곡 ≤35% · 1위 곡 ≤25% · 같은 사람 완화 ≤3/40곡 · 심취 ≤5/40곡',
    '- 상위 20곡·6감정+ 자리는 응답이 많을수록 커진다. 응답 수가 같은 폴더끼리만 비교하고, 판정은 회차(입력 40개)별 폴더 값의 평균으로 한다',
    '- 6감정+ 자리: 6개 이상 감정의 화면에 나온 곡이 차지한 자리 비율 (감정과 무관한 머리 곡)',
    '- 같은 입력: 같은 문장을 두 번 넣었을 때 두 화면 10곡 중 겹친 곡 수 (같은 입력이 두 번 이상 기록된 폴더만)',
    '- 같은 사람: 입력 순서대로 5개씩 끊어 한 사람의 연속 사용으로 본다(예: 기쁨 3번 → 슬픔 2번). 2~5번째 화면 40곡 중 앞에서 이미 본 곡 수의 평균',
    '',
    row([
      '변형·모델',
      '모드',
      '순서',
      '상위 20곡',
      '1위 곡 (목록 중)',
      '6감정+ 자리',
      '같은 입력 겹침',
      '같은 사람 5회 중 다시 본 곡',
      '10곡 채움',
    ]),
    row(Array(9).fill('---')),
    ...screen,
  );

  if (misses.length) {
    lines.push(
      '',
      `## 해석 실패 곡 (${misses.length}건, 앞 40건) — 환각인지 표기 문제인지 확인용`,
      '',
      row(['모델', '지역', '아티스트', '곡']),
      row(Array(4).fill('---')),
      ...misses.slice(0, 40).map(row),
    );
  }
  const markdown = `${lines.join('\n')}\n`;
  fs.writeFileSync(path.join(outDir, 'summary.md'), markdown);
  console.log(markdown);
}

/** 같은 라벨의 기존 폴더를 이어 쓴다 — pick 과 resolve 를 다른 날 실행해도 한 폴더에 모이게 */
function resolveOutDir(args) {
  if (args.out) return path.resolve(args.out);
  const root = path.join(REPO, 'docs/measurements');
  const existing = fs
    .readdirSync(root)
    .filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d) && d.slice(11) === args.label)
    .sort();
  if (existing.length) return path.join(root, existing.at(-1));
  if (args.command !== 'pick')
    throw new Error(
      `라벨 ${args.label} 의 pick 결과 폴더가 없음 — pick 부터 실행`,
    );
  return path.join(root, `${today()}-${args.label}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = resolveOutDir(args);
  fs.mkdirSync(outDir, { recursive: true });
  // 모의 모드는 .env 가 없는 빈 임시 폴더에서 실행해 실제 키를 아예 읽지 않는다
  if (args.mock)
    process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'artune-probe-')));
  if (args.command === 'pick') await pick(args, outDir);
  else if (args.command === 'resolve') await resolve(args, outDir);
  else await summary(args, outDir);
}

main().catch((error) => {
  console.error(`[probe] 실패: ${error.message}`);
  process.exit(1);
});
