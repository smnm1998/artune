/**
 * 평가 원자료(raw.jsonl) → 자동 지표 요약(summary.md). 지표 정의는 docs/measurements/eval/README.md
 * 실행: node scripts/eval/summarize.cjs <산출물 폴더>
 */
const fs = require('node:fs');
const path = require('node:path');

const REGIONS = ['korea', 'pop', 'jpop'];
const MODES = ['immerse', 'soothe'];
const QUOTA = { korea: 6, pop: 3, jpop: 1 };
const THROTTLE = new Set([403, 429]);

const key = (artist, title) => `${artist}|${title}`.toLowerCase();
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : NaN);
const quantile = (xs, q) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(0)}% (${n}/${d})` : '-');
const num = (x, digits = 1) => (Number.isFinite(x) ? x.toFixed(digits) : '-');
const sec = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : '-');

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

/** 시드 → 지역 맵 (모드별) */
function seedRegions(run, mode) {
  const map = new Map();
  const seeds = run.llm?.output?.[mode]?.seeds ?? {};
  for (const region of REGIONS)
    for (const s of seeds[region] ?? [])
      map.set(key(s.artist, s.title), region);
  return map;
}

/** 최종 곡 각각의 지역·출처(LLM 시드 / Last.fm 확장) */
function finalTracks(run, mode) {
  const m = run.modes?.[mode];
  if (!m) return [];
  const regionOf = new Map();
  for (const region of REGIONS)
    for (const r of m.resolve?.[region]?.resolved ?? [])
      regionOf.set(r.trackId, region);
  const seeds = seedRegions(run, mode);
  const fromSeed = new Set(
    m.resolveCalls
      .filter((c) => c.trackId != null && seeds.has(key(c.artist, c.title)))
      .map((c) => c.trackId),
  );
  return m.tracks.map((t) => ({
    ...t,
    region: regionOf.get(t.trackId) ?? null,
    source: fromSeed.has(t.trackId) ? 'seed' : 'lastfm',
  }));
}

function summarizeRuns(runs) {
  const out = {
    tracks: [],
    regions: { korea: [], pop: [], jpop: [] },
    deviation: [],
    seed: 0,
    lastfm: 0,
  };
  const seedResolve = Object.fromEntries(
    REGIONS.map((r) => [r, { tried: 0, ok: 0 }]),
  );
  const seedExpand = Object.fromEntries(
    REGIONS.map((r) => [r, { total: 0, expanded: 0 }]),
  );
  for (const run of runs) {
    for (const mode of MODES) {
      const finals = finalTracks(run, mode);
      out.tracks.push(finals.length);
      const counts = Object.fromEntries(
        REGIONS.map((r) => [r, finals.filter((t) => t.region === r).length]),
      );
      REGIONS.forEach((r) => out.regions[r].push(counts[r]));
      out.deviation.push(
        sum(REGIONS.map((r) => Math.abs(counts[r] - QUOTA[r]))),
      );
      out.seed += finals.filter((t) => t.source === 'seed').length;
      out.lastfm += finals.filter((t) => t.source === 'lastfm').length;

      const seeds = seedRegions(run, mode);
      const calls = new Map(
        (run.modes?.[mode]?.resolveCalls ?? []).map((c) => [
          key(c.artist, c.title),
          c.trackId,
        ]),
      );
      for (const [k, region] of seeds) {
        if (calls.has(k)) {
          seedResolve[region].tried++;
          if (calls.get(k) != null) seedResolve[region].ok++;
        }
      }
      for (const s of run.modes?.[mode]?.similar ?? []) {
        const region = seeds.get(key(s.artist, s.title));
        if (!region) continue;
        seedExpand[region].total++;
        if (s.count > 0) seedExpand[region].expanded++;
      }
    }
  }
  return { ...out, seedResolve, seedExpand };
}

function main() {
  const dir = process.argv[2];
  if (!dir)
    throw new Error('사용법: node scripts/eval/summarize.cjs <산출물 폴더>');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const runs = fs
    .readFileSync(path.join(dir, 'raw.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const ok = runs.filter((r) => !r.error);
  // 반복 실행은 캐시가 데워진 상태라 호출 수·지연을 낮춰 보이게 한다 → 반복도 외 지표는 본 실행만
  const main1 = ok.filter((r) => r.pass === 1);
  const isThrottled = (r) =>
    r.http.some((h) => h.host === 'itunes.apple.com' && THROTTLE.has(h.status));
  const lines = [];
  const push = (...xs) => lines.push(...xs, '');

  push(
    `# 평가 요약 — ${meta.label}`,
    [
      meta.git?.head
        ? `- 커밋 \`${meta.git.head}\`${meta.git.dirty ? ' (작업트리 변경 있음 ⚠️)' : ''}, 앱 코드가 기준선 \`${meta.git.appCode.baseline}\` 과 ${meta.git.appCode.same === true ? '같음' : meta.git.appCode.same === false ? '다름' : '확인 불가'}`
        : '- git 정보 없음',
      `- 모델: ${meta.models.join(', ') || '-'} · Node ${meta.node} · 상태 ${meta.status}${meta.harness.mock ? ' · **모의 실행**' : ''}`,
      `- 실행 ${runs.length}회 (본 ${runs.filter((r) => r.pass === 1).length} + 반복 ${runs.filter((r) => r.pass === 2).length}), 실패 ${runs.length - ok.length}회, 간격 ${meta.harness.interval}초, 시드 ${meta.harness.seed}`,
      `- ${meta.startedAt} → ${meta.endedAt ?? '(진행 중)'}`,
    ].join('\n'),
  );

  // 감정 분류
  const kinds = [...new Set(main1.map((r) => r.kind))];
  const hit = (r) => r.expected.includes(r.llm?.output?.emotion);
  push(
    '## 감정 분류 일치율 (본 실행)',
    table(
      ['구분', '일치율'],
      [
        ...kinds.map((k) => [
          k,
          pct(
            main1.filter((r) => r.kind === k && hit(r)).length,
            main1.filter((r) => r.kind === k).length,
          ),
        ]),
        ['전체', pct(main1.filter(hit).length, main1.length)],
      ],
    ),
  );
  const misses = main1.filter((r) => !hit(r));
  if (misses.length) {
    push(
      table(
        ['id', '예측', '정답'],
        misses.map((r) => [
          r.id,
          r.llm?.output?.emotion ?? '-',
          r.expected.join(', '),
        ]),
      ),
    );
  }

  // 추천 결과 (throttle 유무로 나눠서도)
  const groups = [
    ['전체', main1],
    ['throttle 없음', main1.filter((r) => !isThrottled(r))],
    ['throttle 있음', main1.filter(isThrottled)],
  ];
  const stats = groups.map(([name, rs]) => [
    name,
    rs.length,
    summarizeRuns(rs),
  ]);
  push(
    '## 추천 결과 (모드 단위, 본 실행)',
    table(
      [
        '구분',
        '요청',
        '수율(평균/최소)',
        'korea/pop/jpop 평균',
        '6:3:1 편차',
        '출처 시드/확장',
      ],
      stats.map(([name, n, s]) => [
        name,
        n,
        `${num((mean(s.tracks) / 10) * 100, 0)}% / ${s.tracks.length ? Math.min(...s.tracks) : '-'}곡`,
        REGIONS.map((r) => num(mean(s.regions[r]))).join(' / '),
        num(mean(s.deviation)),
        pct(s.seed, s.seed + s.lastfm) +
          ' / ' +
          pct(s.lastfm, s.seed + s.lastfm),
      ]),
    ),
  );
  const all = stats[0][2];
  push(
    '## 시드 해석·확장 (지역별, 전체)',
    table(
      ['지역', '시드 해석률', '시드 확장률'],
      REGIONS.map((r) => [
        r,
        pct(all.seedResolve[r].ok, all.seedResolve[r].tried),
        pct(all.seedExpand[r].expanded, all.seedExpand[r].total),
      ]),
    ),
  );

  // 외부 호출
  const hosts = ['api.openai.com', 'ws.audioscrobbler.com', 'itunes.apple.com'];
  const per = (r, host) => r.http.filter((h) => h.host === host).length;
  push(
    '## 외부 호출 (요청당, 본 실행)',
    table(
      ['호스트', '평균', '최대', '실패(상태≠2xx)'],
      hosts.map((h) => [
        h,
        num(mean(main1.map((r) => per(r, h)))),
        Math.max(0, ...main1.map((r) => per(r, h))),
        sum(
          main1.map(
            (r) =>
              r.http.filter(
                (x) => x.host === h && !(x.status >= 200 && x.status < 300),
              ).length,
          ),
        ),
      ]),
    ),
    `- iTunes 403·429: ${sum(main1.map((r) => r.http.filter((h) => h.host === 'itunes.apple.com' && THROTTLE.has(h.status)).length))}건, throttle 플래그 요청 ${pct(main1.filter(isThrottled).length, main1.length)}`,
  );
  const usage = main1.flatMap((r) =>
    r.http.filter((h) => h.usage).map((h) => h.usage),
  );
  if (usage.length) {
    push(
      `- OpenAI 토큰(요청당 평균): 입력 ${num(mean(usage.map((u) => u.prompt_tokens)), 0)} · 출력 ${num(mean(usage.map((u) => u.completion_tokens)), 0)}`,
    );
  }

  // 지연
  const music = (r) => Math.max(...MODES.map((m) => r.modes?.[m]?.ms ?? 0));
  const latency = [
    ['요청 전체', main1.map((r) => r.ms)],
    ['LLM', main1.map((r) => r.llm?.ms).filter(Number.isFinite)],
    ['음악(두 모드 중 긴 쪽)', main1.map(music)],
  ];
  push(
    '## 지연 (본 실행)',
    table(
      ['구간', '중앙값', 'p90', '최대'],
      latency.map(([n, xs]) => [
        n,
        sec(quantile(xs, 0.5)),
        sec(quantile(xs, 0.9)),
        sec(Math.max(...xs)),
      ]),
    ),
  );

  // 반복도
  const pairs = ok
    .filter((r) => r.pass === 2)
    .map((r2) => [main1.find((r1) => r1.id === r2.id), r2])
    .filter(([r1]) => r1);
  if (pairs.length) {
    const jaccard = (a, b) => {
      const A = new Set(a.map((t) => t.trackId));
      const B = new Set(b.map((t) => t.trackId));
      const inter = [...A].filter((x) => B.has(x)).length;
      return A.size + B.size - inter ? inter / (A.size + B.size - inter) : NaN;
    };
    push(
      '## 반복도 (같은 입력 2회)',
      table(
        ['id', '감정 일치', 'immerse Jaccard', 'soothe Jaccard'],
        pairs.map(([a, b]) => [
          a.id,
          a.llm?.output?.emotion === b.llm?.output?.emotion
            ? '예'
            : `아니오 (${a.llm?.output?.emotion}→${b.llm?.output?.emotion})`,
          ...MODES.map((m) =>
            num(
              jaccard(a.modes?.[m]?.tracks ?? [], b.modes?.[m]?.tracks ?? []),
              2,
            ),
          ),
        ]),
      ),
    );
  }

  const failed = runs.filter((r) => r.error);
  if (failed.length)
    push(
      '## 실패',
      table(
        ['seq', 'id', '오류'],
        failed.map((r) => [r.seq, r.id, r.error]),
      ),
    );

  const markdown = lines.join('\n');
  fs.writeFileSync(path.join(dir, 'summary.md'), markdown);
  console.log(markdown);
}

main();
