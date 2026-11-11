import { createHash } from 'node:crypto';
import {
  buildPickFormat,
  buildPickPrompt,
  DEFAULT_SONGS,
  PICK_PROMPT_VERSION,
  PICKS_PER_MODE,
} from './pick-prompt';

// strict 모드 규칙: 모든 객체는 additionalProperties: false, 모든 속성이 required — 어기면 API가 요청을 거부한다
function strictViolations(schema, path = '$'): string[] {
  if (schema.type === 'array')
    return strictViolations(schema.items, `${path}[]`);
  if (schema.type !== 'object') return [];
  const keys = Object.keys(schema.properties);
  const own = [
    schema.additionalProperties !== false && `${path}: additionalProperties`,
    keys.some((k) => !schema.required.includes(k)) && `${path}: required`,
  ].filter(Boolean) as string[];
  return [
    ...own,
    ...keys.flatMap((k) =>
      strictViolations(schema.properties[k], `${path}.${k}`),
    ),
  ];
}

describe('buildPickFormat', () => {
  it('스키마는 strict 규칙을 지킨다', () => {
    expect(strictViolations(buildPickFormat().json_schema.schema)).toEqual([]);
  });

  it('곡보다 감정·위기·공감 문구가 먼저 생성되도록 속성을 둔다', () => {
    const { properties } = buildPickFormat().json_schema.schema;
    expect(Object.keys(properties)).toEqual([
      'emotion',
      'crisis',
      'description',
      'immerse',
      'soothe',
    ]);
  });
});

describe('buildPickPrompt', () => {
  const prompt = buildPickPrompt();

  it('위기 신호·공감 문구 규칙을 포함한다', () => {
    expect(prompt).toContain('[위기 신호 — crisis]');
    expect(prompt).toContain('[공감 문구 — description]');
  });

  it('스크리닝으로 고른 지시(C1~C4)를 모두 담는다', () => {
    expect(prompt).toContain('음차·번역·옛 이름 금지'); // C1 공식 표기
    expect(prompt).toContain('호감·애정이면 romance'); // C2 감정 경계
    expect(prompt).toContain('soothe 는 순서가 있는 흐름이다'); // C3 완화 궤적
    for (const song of DEFAULT_SONGS)
      expect(prompt).toContain(`${song.artist} - ${song.title}`); // C4 기본곡 회피
  });

  it('곡 수 지시는 모드별 곡 수를 따른다 — 완화만 15곡(C6)', () => {
    expect(prompt).toContain(
      '[곡 수] immerse 12곡: korea 7곡, pop 4곡, jpop 1곡. soothe 15곡: korea 8곡, pop 5곡, jpop 2곡.',
    );
  });
});

describe('PICKS_PER_MODE', () => {
  it('화면 6:3:1보다 심취는 지역마다 1·1·0곡, 완화는 2·2·1곡 많다', () => {
    expect(PICKS_PER_MODE).toEqual({
      immerse: { korea: 7, pop: 4, jpop: 1 },
      soothe: { korea: 8, pop: 5, jpop: 2 },
    });
  });
});

describe('PICK_PROMPT_VERSION', () => {
  const sha1 = (text: string) =>
    createHash('sha1').update(text).digest('hex').slice(0, 12);

  // 측정 결과는 버전 이름으로 묶인다 — 프롬프트·스키마가 바뀌었는데 이름이 그대로면 다른 프롬프트의 결과가 섞인다.
  // promptSha1은 probe-picks meta.json에 남는 값과 같다(V5 = 11/6 D4 측정의 e6101d539ce6)
  it('프롬프트·스키마가 바뀌면 깨진다 → 버전을 올리고 해시를 갱신한다', () => {
    expect({
      version: PICK_PROMPT_VERSION,
      promptSha1: sha1(buildPickPrompt()),
      formatSha1: sha1(JSON.stringify(buildPickFormat())),
    }).toEqual({
      version: 'V5',
      promptSha1: 'e6101d539ce6',
      formatSha1: 'f5d73ec56f52',
    });
  });
});
