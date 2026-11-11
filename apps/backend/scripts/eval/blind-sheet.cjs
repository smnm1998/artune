/**
 * 블라인드 무드 적합도 (R5) — 기준선과 R5의 화면 곡을 라벨 없이 섞어 곡마다 점수를 매기고, 다 매긴 뒤 열쇠와 맞춰 집계한다.
 * 방식과 점수 기준은 docs/measurements/eval/README.md "R5 최종 비교"(11/11 고정)
 *
 * 묶음 = 입력 × 모드(본 실행만). 기준선 화면 곡 k개 + R5 화면 곡 중 고정 시드로 뽑은 k개.
 * 기준선이 0곡인 묶음은 빼고, 같은 곡(같은 id)이 양쪽에 있으면 한 줄로 매겨 점수를 양쪽에 넣는다.
 *
 * 실행 (apps/backend 에서):
 *   node scripts/eval/blind-sheet.cjs make --target 2026-11-12-r5      # blind/sheet.csv · blind/key.json
 *   → sheet.csv를 복사해 scores-user.csv로 저장하고 점수 칸을 채운다 (Claude 보조는 scores-claude.csv)
 *   node scripts/eval/blind-sheet.cjs summary --target 2026-11-12-r5   # 열쇠와 맞춰 blind/summary.md
 * 옵션: --baseline <폴더>(기본 2026-11-02-baseline) --server <이름>(R5 결과의 서버, 기본 current) --seed <n>(기본 20261111)
 * 결과: docs/measurements/<target>/blind/ — sheet.csv(평가용, 라벨 없음) · key.json(어느 쪽 곡인지 — 점수를 다 매긴 뒤에 연다)
 *       · scores-<평가자>.csv(점수를 채운 시트) · summary.md. 판정은 scores-user.csv, 나머지 평가자는 일치도 확인용
 */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const MEASUREMENTS = path.join(REPO, 'docs/measurements');
const INPUTS = path.join(MEASUREMENTS, 'eval/inputs.json');
const MODES = ['immerse', 'soothe'];
const MODE_TEXT = {
  immerse: '심취 — 지금 감정에 더 깊이 머물게 하는 곡',
  soothe: '완화 — 그 감정에서 부드럽게 빠져나오게 하는 곡',
};
const PRIMARY = 'user'; // 판정에 쓰는 평가자 (eval README: 사용자가 전부 매긴다)
const HEADER = [
  '번호',
  '묶음',
  '글',
  '모드',
  '곡',
  '들어보기',
  '점수(1~5)',
  '모름',
  '메모',
];

const log = (message) => console.log(`[blind] ${message}`);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {
    command,
    target: null,
    baseline: '2026-11-02-baseline',
    server: 'current',
    seed: 20261111,
  };
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i];
    const value = rest[++i];
    if (value === undefined) throw new Error(`${key} 값이 없음`);
    if (key === '--target') args.target = value;
    else if (key === '--baseline') args.baseline = value;
    else if (key === '--server') args.server = value;
    else if (key === '--seed') args.seed = Number(value);
    else throw new Error(`알 수 없는 옵션: ${key}`);
  }
  if (!['make', 'summary'].includes(command))
    throw new Error('명령: make | summary');
  if (!args.target) throw new Error('--target <결과 폴더 이름> 필요');
  if (!Number.isInteger(args.seed)) throw new Error('--seed 는 정수');
  return args;
}

const readJsonl = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

/** 문자열 → 32비트 시드 (FNV-1a) — 묶음마다 다른 시드를 묶음 순서와 상관없이 정한다 */
function hash(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** 고정 시드 섞기 (mulberry32 + Fisher–Yates, probe-latency와 같은 방식) */
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

// ── CSV (따옴표 · 쉼표 · 줄바꿈이 든 칸, 엑셀 · Numbers가 붙이는 BOM) ──

const cell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const toCsv = (rows) =>
  `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((r) => r.some((c) => c.trim()));
}

// ── make: 시트와 열쇠 ──

/** 기준선 본 실행(pass 1)의 화면 곡 — iTunes 원본 필드 */
function baselineSongs(folder) {
  const rows = readJsonl(path.join(MEASUREMENTS, folder, 'raw.jsonl'));
  const byId = new Map();
  for (const r of rows.filter((x) => x.pass === 1)) {
    byId.set(
      r.id,
      Object.fromEntries(
        MODES.map((m) => [
          m,
          (r.modes?.[m]?.tracks ?? []).map((t) => ({
            id: String(t.trackId),
            artist: t.artistName,
            name: t.trackName,
          })),
        ]),
      ),
    );
  }
  return byId;
}

/** R5 본 실행(round 1)의 화면 곡 — probe-latency raw의 songs */
function r5Songs(folder, server) {
  const rows = readJsonl(path.join(MEASUREMENTS, folder, 'raw.jsonl')).filter(
    (r) => r.server === server && (r.round ?? 1) === 1,
  );
  if (!rows.length)
    throw new Error(`${folder}에 서버 ${server}의 본 실행 기록이 없음`);
  if (!rows.every((r) => r.songs))
    throw new Error(
      `${folder}의 기록에 화면 곡(songs)이 없음 — 11/11 이후 probe-latency로 잰 폴더만`,
    );
  return new Map(
    rows.filter((r) => r.status === 'ok').map((r) => [r.id, r.songs]),
  );
}

function make(args) {
  const outDir = path.join(MEASUREMENTS, args.target, 'blind');
  if (fs.existsSync(path.join(outDir, 'key.json')))
    throw new Error(
      `이미 있는 시트: ${path.relative(REPO, outDir)} — 다시 만들면 점수와 번호가 어긋난다. 지우고 다시 하려면 직접 지운다`,
    );
  const { inputs } = JSON.parse(fs.readFileSync(INPUTS, 'utf8'));
  const base = baselineSongs(args.baseline);
  const r5 = r5Songs(args.target, args.server);

  const groups = [];
  const excluded = [];
  for (const input of inputs) {
    for (const mode of MODES) {
      const before = base.get(input.id)?.[mode] ?? [];
      const after = r5.get(input.id)?.[mode];
      if (!before.length) {
        excluded.push({ id: input.id, mode, reason: '기준선 0곡' });
        continue;
      }
      if (!after?.length) {
        excluded.push({ id: input.id, mode, reason: 'R5 기록 없음·0곡' });
        continue;
      }
      const k = before.length;
      const sample = shuffled(
        after,
        hash(`${args.seed}|${input.id}|${mode}`),
      ).slice(0, k);
      // 같은 id는 한 줄로 — 점수를 양쪽에 넣는다
      const byId = new Map();
      for (const [system, songs] of [
        ['baseline', before],
        ['r5', sample],
      ])
        for (const song of songs) {
          const item = byId.get(song.id) ?? { ...song, systems: [] };
          if (!item.systems.includes(system)) item.systems.push(system);
          byId.set(song.id, item);
        }
      groups.push({
        id: input.id,
        kind: input.kind,
        text: input.text,
        mode,
        k,
        r5Count: after.length,
        songs: shuffled(
          [...byId.values()],
          hash(`${args.seed}|order|${input.id}|${mode}`),
        ),
      });
    }
  }

  const ordered = shuffled(groups, args.seed);
  let item = 0;
  const sheet = [HEADER];
  const key = ordered.map((g, index) => ({
    group: index + 1,
    id: g.id,
    kind: g.kind,
    mode: g.mode,
    k: g.k,
    r5Count: g.r5Count,
    items: g.songs.map((song) => {
      item += 1;
      sheet.push([
        item,
        index + 1,
        g.text,
        MODE_TEXT[g.mode],
        `${song.artist} - ${song.name}`,
        `https://music.apple.com/kr/song/${song.id}`,
        '',
        '',
        '',
      ]);
      return {
        item,
        id: song.id,
        artist: song.artist,
        name: song.name,
        systems: song.systems,
      };
    }),
  }));

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'sheet.csv'), toCsv(sheet));
  const shared = key
    .flatMap((g) => g.items)
    .filter((x) => x.systems.length === 2).length;
  fs.writeFileSync(
    path.join(outDir, 'key.json'),
    `${JSON.stringify(
      {
        note: '어느 쪽 곡인지 — 점수를 다 매긴 뒤에 연다',
        createdAt: new Date().toISOString(),
        baseline: args.baseline,
        target: args.target,
        server: args.server,
        seed: args.seed,
        items: item,
        shared,
        groups: key,
        excluded,
      },
      null,
      2,
    )}\n`,
  );
  log(
    `묶음 ${key.length}개 · 곡 ${item}줄(양쪽에 같은 곡 ${shared}) · 뺀 묶음 ${excluded.length}개 → ${path.relative(REPO, outDir)}/sheet.csv`,
  );
  log(
    'sheet.csv를 복사해 scores-user.csv로 저장하고 점수 칸을 채운다 — key.json은 다 매긴 뒤에 연다',
  );
}

// ── summary: 열쇠와 맞춰 집계 ──

/** 점수 시트 → 번호별 { score(1~5) | unknown } — 헤더 이름으로 칸을 찾는다 */
function readScores(file, total) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = (name) => header.findIndex((h) => h.trim().startsWith(name));
  const [iItem, iScore, iUnknown] = ['번호', '점수', '모름'].map(col);
  if ([iItem, iScore, iUnknown].includes(-1))
    throw new Error(`${path.basename(file)}: 번호·점수·모름 칸을 찾지 못함`);
  const scores = new Map();
  const problems = [];
  for (const r of rows) {
    const item = Number(r[iItem]);
    const raw = (r[iScore] ?? '').trim();
    const unknown = Boolean((r[iUnknown] ?? '').trim());
    if (!Number.isInteger(item) || item < 1 || item > total) {
      problems.push(`번호 ${r[iItem]} 이상함`);
      continue;
    }
    if (unknown && !raw) scores.set(item, { unknown: true });
    else if (/^[1-5]$/.test(raw)) scores.set(item, { score: Number(raw) });
    else problems.push(`${item}번 점수 "${raw}"`);
  }
  for (let i = 1; i <= total; i++)
    if (!scores.has(i) && !problems.some((p) => p.startsWith(`${i}번`)))
      problems.push(`${i}번 빈칸`);
  return { scores, problems };
}

const mean = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const fixed = (x, digits = 2) => (x == null ? '—' : x.toFixed(digits));
const signed = (x) => (x == null ? '—' : `${x > 0 ? '+' : ''}${x.toFixed(2)}`);
const table = (header, body) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');

/** 한 평가자의 점수 → 쪽별 평균 · 묶음별 차이 */
function evaluate(key, scores) {
  const perGroup = key.groups.map((g) => {
    const side = (system) =>
      g.items
        .filter((x) => x.systems.includes(system))
        .map((x) => scores.get(x.item))
        .filter((s) => s && !s.unknown)
        .map((s) => s.score);
    const before = side('baseline');
    const after = side('r5');
    const diff =
      before.length && after.length ? mean(after) - mean(before) : null;
    return { g, before, after, diff };
  });
  const sides = (system, mode) =>
    perGroup
      .filter((x) => !mode || x.g.mode === mode)
      .flatMap((x) => (system === 'baseline' ? x.before : x.after));
  const diffs = (mode) =>
    perGroup
      .filter((x) => (!mode || x.g.mode === mode) && x.diff != null)
      .map((x) => x.diff);
  const unknown = [...scores.values()].filter((s) => s.unknown).length;
  return { perGroup, sides, diffs, unknown };
}

function summary(args) {
  const dir = path.join(MEASUREMENTS, args.target, 'blind');
  const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^scores-[\w-]+\.csv$/.test(f))
    .sort();
  if (!files.length) throw new Error('scores-<평가자>.csv 가 없음');
  const raters = new Map();
  for (const file of files) {
    const name = file.slice('scores-'.length, -'.csv'.length);
    const { scores, problems } = readScores(path.join(dir, file), key.items);
    if (problems.length)
      throw new Error(
        `${file}: ${problems.slice(0, 10).join(' · ')}${problems.length > 10 ? ` 외 ${problems.length - 10}건` : ''}`,
      );
    raters.set(name, { scores, result: evaluate(key, scores) });
  }

  const allItems = key.groups.flatMap((g) => g.items);
  const slots = (system) =>
    key.groups.flatMap((g) =>
      g.items.filter((x) => x.systems.includes(system)),
    );
  const unique = (system) => new Set(slots(system).map((x) => x.id)).size;
  const lines = [
    `# 블라인드 무드 적합도 — ${args.target}`,
    '',
    `- 기준선 \`${key.baseline}\` vs R5 \`${key.target}\`(서버 ${key.server}) · 시드 ${key.seed} · 방식과 점수 기준은 eval README "R5 최종 비교"`,
    `- 묶음 ${key.groups.length}개(입력 × 모드) · 곡 ${key.items}줄, 그중 양쪽에 같은 곡 ${key.shared}줄 · 뺀 묶음 ${key.excluded.length}개(${[...new Set(key.excluded.map((x) => x.reason))].join(', ')})`,
    `- 고유 곡 / 자리: 기준선 ${unique('baseline')} / ${slots('baseline').length} · R5 ${unique('r5')} / ${slots('r5').length} — 같은 곡이 여러 묶음에 나오면 묶음마다 따로 매겼다`,
    `- 판정: 평가자 \`${PRIMARY}\`의 묶음별 (R5 평균 − 기준선 평균)의 평균 ≥ 0 이면 회귀 없음. 다른 평가자는 일치도 확인용`,
    '',
    '## 평가자별',
    '',
  ];
  const rows = [];
  for (const [name, { result }] of raters) {
    for (const mode of [null, ...MODES]) {
      const d = result.diffs(mode);
      const win = d.filter((x) => x > 0).length;
      const tie = d.filter((x) => x === 0).length;
      rows.push([
        `\`${name}\`${name === PRIMARY ? ' (판정)' : ''}`,
        mode ? MODE_TEXT[mode].split(' — ')[0] : '전체',
        `${fixed(mean(result.sides('baseline', mode)))} (${result.sides('baseline', mode).length}곡)`,
        `${fixed(mean(result.sides('r5', mode)))} (${result.sides('r5', mode).length}곡)`,
        signed(mean(d)),
        `${win} · ${tie} · ${d.length - win - tie}`,
        mode ? '' : `${result.unknown}`,
      ]);
    }
  }
  lines.push(
    table(
      [
        '평가자',
        '모드',
        '기준선 평균',
        'R5 평균',
        '묶음별 차이 평균',
        '승 · 무 · 패 (R5 기준)',
        '모름',
      ],
      rows,
    ),
  );
  const primary = raters.get(PRIMARY);
  if (primary) {
    const d = mean(primary.result.diffs(null));
    lines.push(
      '',
      `- **판정: ${d == null ? '—' : d >= 0 ? '회귀 없음 ✅' : '회귀 ❌'}** (묶음별 차이 평균 ${signed(d)})`,
    );
  } else
    lines.push(
      '',
      `- 판정 평가자 \`${PRIMARY}\`의 점수(scores-${PRIMARY}.csv)가 없어 판정하지 않음`,
    );

  // 평가자 일치도 — 둘 다 점수를 낸(모름 아님) 곡끼리
  const names = [...raters.keys()];
  if (names.length > 1) {
    const pairs = [];
    for (let a = 0; a < names.length; a++)
      for (let b = a + 1; b < names.length; b++) {
        const both = allItems
          .map((x) => [
            raters.get(names[a]).scores.get(x.item),
            raters.get(names[b]).scores.get(x.item),
          ])
          .filter(([p, q]) => p && q && !p.unknown && !q.unknown)
          .map(([p, q]) => p.score - q.score);
        const pct = (n) =>
          both.length ? `${Math.round((n / both.length) * 100)}%` : '—';
        pairs.push([
          `\`${names[a]}\` · \`${names[b]}\``,
          `${both.length}`,
          pct(both.filter((x) => x === 0).length),
          pct(both.filter((x) => Math.abs(x) <= 1).length),
          signed(mean(both)),
        ]);
      }
    lines.push(
      '',
      '## 평가자 일치도',
      '',
      table(
        [
          '평가자',
          '둘 다 매긴 곡',
          '같은 점수',
          '차이 ≤ 1',
          '평균 차이 (앞 − 뒤)',
        ],
        pairs,
      ),
    );
  }

  if (primary) {
    lines.push(
      '',
      `## 묶음별 (\`${PRIMARY}\`)`,
      '',
      table(
        ['묶음', '입력', '모드', 'k', '기준선 평균', 'R5 평균', '차이'],
        primary.result.perGroup.map(({ g, before, after, diff }) => [
          `${g.group}`,
          g.id,
          MODE_TEXT[g.mode].split(' — ')[0],
          `${g.k}`,
          fixed(mean(before)),
          fixed(mean(after)),
          signed(diff),
        ]),
      ),
    );
  }
  lines.push('');
  fs.writeFileSync(path.join(dir, 'summary.md'), lines.join('\n'));
  log(
    `요약: ${path.relative(REPO, path.join(dir, 'summary.md'))} (평가자 ${names.join(', ')})`,
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'make') make(args);
  else summary(args);
}

try {
  main();
} catch (error) {
  console.error(`[blind] 실패: ${error.message}`);
  process.exit(1);
}
