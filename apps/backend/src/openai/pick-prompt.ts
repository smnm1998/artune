import { EMOTIONS, Emotion } from '../emotion/constants/emotions.constant';
import type { PlaylistMode } from '../music/exposure-window';
import type { Region } from '../music/utils/region-quota.util';

/**
 * LLM 직접 선곡 — 프롬프트·응답 스키마 빌더 (R2)
 *
 * 운영과 측정(scripts/eval/probe-picks.cjs)이 같은 빌더를 쓴다: 잰 프롬프트가 곧 배포하는 프롬프트.
 * 변형은 누적이다(V0 → V4). 스크리닝으로 고른 변형이 운영 기본값이 된다.
 * V5는 운영 후보 V3에서 갈라진다(V4의 reading·targets는 쓰지 않는다).
 * V0 = 11/2·11/3 프로브 프롬프트(promptSha1 eb886af1b088) + R1 필드(crisis, description).
 */
export interface PickPromptOptions {
  /** C1 Apple Music 공식 표기 그대로, 음차·번역·옛 이름 금지 */
  officialNotation: boolean;
  /** C2 romance(사람에 대한 호감) / excited(일·이벤트에 대한 기대) 경계 */
  romanceBoundary: boolean;
  /** C3 완화 궤적(iso principle): 지금 감정에서 출발해 안정 쪽으로 */
  isoSoothe: boolean;
  /** C4 감정과 무관하게 반복되는 기본곡 회피 */
  avoidDefaults: boolean;
  /** C5 곡보다 먼저 reading(맥락 해석)·targets(모드별 무드 목표)를 쓰게 한다 */
  planFields: boolean;
  /** C6 완화만 15곡: 이미 본 곡·머리 곡을 뒤로 밀어도(D3) 화면 10곡을 채울 곡이 남게 한다 */
  overpickSoothe: boolean;
}

const V0: PickPromptOptions = {
  officialNotation: false,
  romanceBoundary: false,
  isoSoothe: false,
  avoidDefaults: false,
  planFields: false,
  overpickSoothe: false,
};
const V1 = { ...V0, officialNotation: true, romanceBoundary: true };
const V2 = { ...V1, isoSoothe: true };
const V3 = { ...V2, avoidDefaults: true };
const V4 = { ...V3, planFields: true };
const V5 = { ...V3, overpickSoothe: true };

export const PICK_VARIANTS: Record<string, PickPromptOptions> = {
  V0,
  V1,
  V2,
  V3,
  V4,
  V5,
};

/** 운영 변형 — D4 판정(11/6, docs/measurements/2026-11-06-d4-r1/analysis.md) */
export const PRODUCTION_PICK_VARIANT = 'V5';

/** 모드당 12곡 — 최종 6:3:1(10곡) + 해석 실패 여유 2곡 */
export const PICKS_PER_MODE: Record<Region, number> = {
  korea: 7,
  pop: 4,
  jpop: 1,
};

/** C6 완화 15곡 — 화면 6:3:1에 지역마다 2·2·1곡 여유 */
export const OVERPICK_SOOTHE: Record<Region, number> = {
  korea: 8,
  pop: 5,
  jpop: 2,
};

export function picksPerMode(
  options: PickPromptOptions,
): Record<PlaylistMode, Record<Region, number>> {
  return {
    immerse: PICKS_PER_MODE,
    soothe: options.overpickSoothe ? OVERPICK_SOOTHE : PICKS_PER_MODE,
  };
}

const countText = (counts: Record<Region, number>) =>
  `${Object.values(counts).reduce((a, b) => a + b, 0)}곡: korea ${counts.korea}곡, pop ${counts.pop}곡, jpop ${counts.jpop}곡`;

/**
 * 감정과 무관하게 반복된 곡 — 11/3 홀드아웃 luna 40응답에서 감정 10종 이상의 선곡에 들어간 8곡.
 * R5 비교용 입력(inputs.json 26개)의 선곡은 쓰지 않았다 (그 입력에 맞춰지지 않도록).
 */
export const DEFAULT_SONGS = [
  { artist: 'Jack Johnson', title: 'Better Together' },
  { artist: 'Jason Mraz', title: "I'm Yours" },
  { artist: '적재', title: '별 보러 가자' },
  { artist: '폴킴', title: '모든 날, 모든 순간' },
  { artist: '정승환', title: '너였다면' },
  { artist: '아이유', title: '마음' },
  { artist: '10CM', title: '폰서트' },
  { artist: 'Corinne Bailey Rae', title: 'Put Your Records On' },
];

export interface PickedTrack {
  artist: string;
  title: string;
  region: Region;
}

export interface PickOutput {
  emotion: Emotion;
  crisis: boolean;
  description: string;
  reading?: string;
  targets?: { immerse: string; soothe: string };
  immerse: PickedTrack[];
  soothe: PickedTrack[];
}

/** 서비스가 반환하는 형태 — 화면 라벨은 LLM이 아니라 enum에서 붙인다 */
export interface PickResult extends PickOutput {
  emotionLabel: string;
}

const section = (title: string, items: (string | false)[]) =>
  [title, ...items.filter(Boolean).map((item) => `- ${item}`)].join('\n');

export function buildPickPrompt(options: PickPromptOptions): string {
  const counts = picksPerMode(options);
  return [
    '너는 감정 기반 음악 큐레이터다. 사용자의 글을 읽고 감정을 하나 고른 뒤, 두 모드의 플레이리스트를 실제 발매곡으로 직접 고른다.',
    section('[감정]', [
      '표면적인 단어나 기호가 아니라 글 전체의 맥락으로 판단한다.',
      options.romanceBoundary &&
        '감정의 대상이 특정 사람에 대한 호감·애정이면 romance, 일·이벤트·경험에 대한 기대면 excited.',
    ]),
    section('[위기 신호 — crisis]', [
      '스스로를 해치거나 삶을 끝내고 싶다는 뜻(자해·자살 생각이나 계획, "사라지고 싶다", "다 끝내고 싶다")이 직접 드러나거나 분명히 읽히면 true',
      '"배고파 죽겠다", "웃겨 죽겠네"처럼 정도를 강조하는 관용 표현, 슬픔·지침만 있는 글은 false',
      '어느 쪽인지 애매하면 true (안내가 한 번 더 보이는 비용이 놓치는 비용보다 작다)',
      'true여도 플레이리스트는 그대로 만든다',
    ]),
    section('[공감 문구 — description]', [
      '한국어 1~2문장, 따뜻한 어조. 판단하거나 훈계하지 않는다.',
    ]),
    options.planFields &&
      section('[먼저 정리 — reading, targets]', [
        'reading: 곡을 고르기 전에 글의 상황과 감정을 한 문장으로 해석한다(표면 단서가 아니라 맥락).',
        'targets: 모드마다 고를 곡의 에너지·질감·가사 주제를 짧은 키워드로 적는다. 곡은 이 정리에 맞춰 고른다.',
      ]),
    section('[모드]', [
      'immerse(감정 심취): 지금 감정에 더 깊이 머물게 하는 곡',
      'soothe(감정 완화): 그 감정에서 부드럽게 빠져나오게 하는 곡',
      options.isoSoothe &&
        'soothe 는 순서가 있는 흐름이다. 첫 곡은 지금 감정에 맞닿은 곡에서 시작해, 뒤로 갈수록 차분하고 안정된 곡으로 옮겨 간다. 감정마다 출발점이 다르므로 soothe 목록도 감정마다 달라야 한다.',
      '두 목록은 듣는 즉시 구분될 만큼 무드(에너지·질감)가 달라야 한다. 곡 자체의 무드로 고른다(아티스트의 대표 스타일이 아니라).',
    ]),
    counts.immerse === counts.soothe
      ? `[곡 수] 모드마다 ${countText(counts.immerse)}. 각 곡의 region 에 표시한다.`
      : `[곡 수] immerse ${countText(counts.immerse)}. soothe ${countText(counts.soothe)}. 각 곡의 region 에 표시한다.`,
    section('[실존]', [
      'Apple Music/iTunes에서 찾을 수 있는 실제 발매곡만. 확실하지 않으면 더 확실한 곡으로 바꾼다. 지어내지 않는다.',
      '한 모드 안에서 곡마다 다른 아티스트.',
    ]),
    options.avoidDefaults &&
      section('[자주 나오는 곡]', [
        `아래 곡은 감정과 상관없이 너무 자주 골라졌다. 이 글에 특별히 잘 맞는 경우가 아니면 고르지 않는다: ${DEFAULT_SONGS.map((s) => `${s.artist} - ${s.title}`).join(', ')}`,
      ]),
    section('[표기]', [
      'title 은 원곡 제목만(Remix·Live·연도·부제 표기 금지).',
      options.officialNotation
        ? 'artist·title 은 Apple Music에 등록된 공식 표기 그대로 쓴다. 음차·번역·옛 이름 금지(10CM을 "십센치"로, AKMU를 "악동뮤지션"으로 쓰지 않는다). 한글로 등록된 곡명은 한글 그대로.'
        : '한국 곡은 공식 한글 표기(공식 표기가 영문이면 영문), 팝은 영문, 일본 곡은 공식 표기(영문 또는 일본어).',
    ]),
  ]
    .filter(Boolean)
    .join('\n\n');
}

const TRACK = {
  type: 'object',
  additionalProperties: false,
  required: ['artist', 'title', 'region'],
  properties: {
    artist: { type: 'string' },
    title: { type: 'string' },
    region: { type: 'string', enum: Object.keys(PICKS_PER_MODE) },
  },
};

/** 속성 순서가 생성 순서다 — 화면에 먼저 쓰는 값(감정·위기·공감 문구)이 곡보다 앞 */
export function buildPickFormat(options: PickPromptOptions) {
  const properties = {
    emotion: { type: 'string', enum: EMOTIONS },
    crisis: { type: 'boolean' },
    description: { type: 'string' },
    ...(options.planFields && {
      reading: { type: 'string' },
      targets: {
        type: 'object',
        additionalProperties: false,
        required: ['immerse', 'soothe'],
        properties: {
          immerse: { type: 'string' },
          soothe: { type: 'string' },
        },
      },
    }),
    immerse: { type: 'array', items: TRACK },
    soothe: { type: 'array', items: TRACK },
  };
  return {
    type: 'json_schema',
    json_schema: {
      name: 'direct_picks',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: Object.keys(properties),
        properties,
      },
    },
  };
}
