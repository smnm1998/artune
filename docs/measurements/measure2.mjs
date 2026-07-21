// SSE 병렬화 후 재측정: SSE 3회, 간격 60s
const BASE = `http://localhost:${process.env.PORT ?? 3100}`;
const texts = [
  '드디어 프로젝트가 끝나서 너무 신나!',
  '옛 친구가 갑자기 생각나서 마음이 아련해',
  '내일 발표가 있어서 너무 떨리고 무서워',
];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < texts.length; i++) {
  const url = `${BASE}/api/emotion/analyze-stream?text=${encodeURIComponent(texts[i])}`;
  const t0 = performance.now();
  process.stdout.write(`[${new Date().toTimeString().slice(0, 8)}] SSE: ${texts[i]}\n`);

  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  const progressLog = [];
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += Buffer.from(chunk).toString();
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = raw.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      try {
        const evt = JSON.parse(line.slice(5));
        if (evt.type === 'progress') progressLog.push(evt.progress);
      } catch {}
    }
  }
  const wall = ((performance.now() - t0) / 1000).toFixed(2);
  const monotonic = progressLog.every((p, j) => j === 0 || p >= progressLog[j - 1]);
  console.log(`  client_total=${wall}s progress=[${progressLog.join(',')}] monotonic=${monotonic}`);

  if (i < texts.length - 1) await delay(60000);
}
console.log('[measure2] DONE');
