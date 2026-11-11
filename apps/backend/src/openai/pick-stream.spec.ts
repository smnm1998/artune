import { Readable } from 'node:stream';
import { PickStreamParser, readSseData } from './pick-stream';
import type { PickOutput } from './pick-prompt';

// 곡명·공감 문구에 구조 문자(따옴표·괄호·쉼표·콜론·백슬래시)와 이스케이프를 섞는다
const OUTPUT: PickOutput = {
  emotion: 'sadness',
  crisis: false,
  description: '오늘은 "그냥" 쉬어도 돼요: {괜찮아}, [정말로]',
  immerse: [
    { artist: '아이유', title: 'Love wins all', region: 'korea' },
    { artist: 'Coldplay', title: 'Fix "You", {live}', region: 'pop' },
    { artist: 'Back\\slash', title: 'a:b,c]d}', region: 'pop' },
  ],
  soothe: [
    { artist: 'YOASOBI', title: '夜に駆ける', region: 'jpop' },
    { artist: 'Amber', title: '줄\n바꿈', region: 'korea' },
  ],
};

function collect(chunks: string[]) {
  const fields: Record<string, unknown> = {};
  const picks: Record<string, unknown[]> = { immerse: [], soothe: [] };
  const parser = new PickStreamParser({
    onField: (key, value) => {
      expect(key in fields).toBe(false); // 같은 필드를 두 번 보내지 않는다
      fields[key] = value;
    },
    onPick: (mode, pick) => picks[mode].push(pick),
  });
  for (const chunk of chunks) parser.push(chunk);
  return { fields, picks, text: parser.text };
}

const expected = {
  fields: {
    emotion: OUTPUT.emotion,
    crisis: OUTPUT.crisis,
    description: OUTPUT.description,
  },
  picks: { immerse: OUTPUT.immerse, soothe: OUTPUT.soothe },
};

/** 고정 시드 난수 (mulberry32) */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('PickStreamParser', () => {
  it('한 번에 받으면 루트 값과 곡을 쓰인 순서대로 꺼낸다', () => {
    const json = JSON.stringify(OUTPUT);
    const { fields, picks, text } = collect([json]);

    expect({ fields, picks }).toEqual(expected);
    expect(text).toBe(json);
  });

  it('어느 위치에서 두 조각으로 잘려도 결과가 같다 (문자열·이스케이프 중간 포함)', () => {
    const json = JSON.stringify(OUTPUT);
    for (let cut = 0; cut <= json.length; cut++) {
      const { fields, picks } = collect([json.slice(0, cut), json.slice(cut)]);
      expect({ fields, picks }).toEqual(expected);
    }
  });

  it('공백·줄바꿈이 있는 JSON을 무작위로 잘게 나눠 받아도 결과가 같다', () => {
    const json = JSON.stringify(OUTPUT, null, 2);
    const random = seeded(7);
    for (let round = 0; round < 200; round++) {
      const chunks: string[] = [];
      for (let i = 0; i < json.length; ) {
        const size = 1 + Math.floor(random() * 12);
        chunks.push(json.slice(i, i + size));
        i += size;
      }
      const { fields, picks } = collect(chunks);
      expect({ fields, picks }).toEqual(expected);
    }
  });

  it('곡이 쓰이는 중에는 완성된 곡까지만 꺼낸다', () => {
    const json = JSON.stringify(OUTPUT);
    const secondPick = json.indexOf('{"artist":"Coldplay"');
    const { picks } = collect([json.slice(0, secondPick + 20)]);

    expect(picks.immerse).toEqual([OUTPUT.immerse[0]]);
    expect(picks.soothe).toEqual([]);
  });

  it('곡 배열이 아닌 객체 값(targets)은 곡으로 보지 않고 필드로 꺼낸다', () => {
    const json = JSON.stringify({
      emotion: 'joy',
      reading: '시험이 끝났다',
      targets: { immerse: '신나게', soothe: '차분하게' },
      immerse: [{ artist: 'A', title: 'a', region: 'pop' }],
      soothe: [],
    });
    const { fields, picks } = collect([json]);

    expect(fields).toEqual({
      emotion: 'joy',
      reading: '시험이 끝났다',
      targets: { immerse: '신나게', soothe: '차분하게' },
    });
    expect(picks).toEqual({
      immerse: [{ artist: 'A', title: 'a', region: 'pop' }],
      soothe: [],
    });
  });
});

describe('readSseData', () => {
  const sse = (...data: string[]) => data.map((d) => `data: ${d}\n\n`).join('');

  it('줄·한글 바이트 중간에서 끊긴 조각을 이어 data 값을 꺼내고, [DONE] 뒤는 버리되 응답 끝까지 읽는다', async () => {
    const bytes = Buffer.from(
      `: keep-alive\n\n${sse('{"t":"기쁨"}', '{"t":2}', '[DONE]', '{"t":3}')}`,
    );
    const cut = bytes.indexOf(Buffer.from('기')) + 1; // '기'의 첫 바이트 뒤
    const stream = Readable.from([
      bytes.subarray(0, 5),
      bytes.subarray(5, cut),
      bytes.subarray(cut),
    ]);

    const out: unknown[] = [];
    for await (const data of readSseData(stream)) out.push(data);

    expect(out).toEqual([{ t: '기쁨' }, { t: 2 }]);
    expect(stream.readableEnded).toBe(true); // 중간에 끊지 않아 연결이 정상으로 끝난다
  });
});
