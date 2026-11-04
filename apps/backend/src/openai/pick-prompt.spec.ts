import {
  buildPickFormat,
  buildPickPrompt,
  DEFAULT_SONGS,
  PICK_VARIANTS,
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
  it.each(Object.keys(PICK_VARIANTS))(
    '%s 스키마는 strict 규칙을 지킨다',
    (variant) => {
      const format = buildPickFormat(PICK_VARIANTS[variant]);
      expect(strictViolations(format.json_schema.schema)).toEqual([]);
    },
  );

  it('곡보다 감정·위기·공감 문구가 먼저 생성되도록 속성을 둔다', () => {
    const { properties } = buildPickFormat(PICK_VARIANTS.V0).json_schema.schema;
    expect(Object.keys(properties)).toEqual([
      'emotion',
      'crisis',
      'description',
      'immerse',
      'soothe',
    ]);
  });

  it('V4는 곡을 고르기 전에 reading·targets를 쓴다', () => {
    const { properties } = buildPickFormat(PICK_VARIANTS.V4).json_schema.schema;
    expect(Object.keys(properties)).toEqual([
      'emotion',
      'crisis',
      'description',
      'reading',
      'targets',
      'immerse',
      'soothe',
    ]);
  });
});

describe('buildPickPrompt', () => {
  const prompt = (variant: string) => buildPickPrompt(PICK_VARIANTS[variant]);

  it('V0는 변형 지시 없이 위기 신호·공감 문구 규칙을 포함한다', () => {
    expect(prompt('V0')).toContain('[위기 신호 — crisis]');
    expect(prompt('V0')).toContain('[공감 문구 — description]');
    expect(prompt('V0')).not.toMatch(
      /음차|romance|흐름이다|자주 나오는 곡|reading/,
    );
  });

  it('변형은 누적된다 — 앞 변형의 지시를 모두 유지한다', () => {
    const order = ['V0', 'V1', 'V2', 'V3', 'V4'];
    for (let i = 1; i < order.length; i++) {
      const before = prompt(order[i - 1])
        .split('\n')
        .filter((l) => l.startsWith('- '));
      const after = prompt(order[i]);
      // V1은 표기 지시를 교체하므로 그 한 줄만 예외
      const kept = before.filter((l) => !l.includes('공식 한글 표기'));
      for (const line of kept) expect(after).toContain(line);
    }
  });

  it('V3부터 기본곡 회피 목록이 들어간다', () => {
    for (const song of DEFAULT_SONGS) {
      expect(prompt('V2')).not.toContain(`${song.artist} - ${song.title}`);
      expect(prompt('V3')).toContain(`${song.artist} - ${song.title}`);
    }
  });
});
