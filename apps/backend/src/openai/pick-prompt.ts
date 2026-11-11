import { EMOTIONS, Emotion } from '../emotion/constants/emotions.constant';
import type { PlaylistMode } from '../music/exposure-window';
import type { Region } from '../music/utils/region-quota.util';

/**
 * LLM 직접 선곡 — 프롬프트·응답 스키마 빌더 (R2)
 *
 * 운영과 측정(scripts/eval/probe-picks.cjs)이 같은 빌더를 쓴다: 잰 프롬프트가 곧 배포하는 프롬프트.
 * V5 = 11/2·11/3 프로브 프롬프트(promptSha1 eb886af1b088) + 위기 신호·공감 문구 + 공식 표기(C1) · romance/excited 경계(C2) · 완화 궤적(C3) · 기본곡 회피(C4) · 완화 15곡(C6).
 * 스크리닝(11/4)·D4 판정(11/6, docs/measurements/2026-11-06-d4-r1/analysis.md)으로 골랐다.
 * 비교에 쓴 변형 V0~V4와 플래그는 11/11에 걷었다 — 마지막으로 들어 있던 커밋은 docs/measurements/eval/README.md
 */

/** 측정 기록용 이름 — probe-picks가 결과를 이 이름으로 묶는다. 프롬프트·스키마를 바꾸면 올린다 */
export const PICK_PROMPT_VERSION = 'V5';

/**
 * 모드별 지역 곡 수 — 화면은 모드마다 6:3:1(10곡).
 * 심취는 해석 실패 여유로 12곡, 완화는 이미 본 곡·자주 나온 곡을 뒤로 밀어도 10곡이 남게 15곡(C6)
 */
export const PICKS_PER_MODE: Record<PlaylistMode, Record<Region, number>> = {
  immerse: { korea: 7, pop: 4, jpop: 1 },
  soothe: { korea: 8, pop: 5, jpop: 2 },
};

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
  immerse: PickedTrack[];
  soothe: PickedTrack[];
}

/** 서비스가 반환하는 형태 — 화면 라벨은 LLM이 아니라 enum에서 붙인다 */
export interface PickResult extends PickOutput {
  emotionLabel: string;
}

const section = (title: string, items: string[]) =>
  [title, ...items.map((item) => `- ${item}`)].join('\n');

export function buildPickPrompt(): string {
  return [
    '너는 감정 기반 음악 큐레이터다. 사용자의 글을 읽고 감정을 하나 고른 뒤, 두 모드의 플레이리스트를 실제 발매곡으로 직접 고른다.',
    section('[감정]', [
      '표면적인 단어나 기호가 아니라 글 전체의 맥락으로 판단한다.',
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
    section('[모드]', [
      'immerse(감정 심취): 지금 감정에 더 깊이 머물게 하는 곡',
      'soothe(감정 완화): 그 감정에서 부드럽게 빠져나오게 하는 곡',
      'soothe 는 순서가 있는 흐름이다. 첫 곡은 지금 감정에 맞닿은 곡에서 시작해, 뒤로 갈수록 차분하고 안정된 곡으로 옮겨 간다. 감정마다 출발점이 다르므로 soothe 목록도 감정마다 달라야 한다.',
      '두 목록은 듣는 즉시 구분될 만큼 무드(에너지·질감)가 달라야 한다. 곡 자체의 무드로 고른다(아티스트의 대표 스타일이 아니라).',
    ]),
    `[곡 수] immerse ${countText(PICKS_PER_MODE.immerse)}. soothe ${countText(PICKS_PER_MODE.soothe)}. 각 곡의 region 에 표시한다.`,
    section('[실존]', [
      'Apple Music/iTunes에서 찾을 수 있는 실제 발매곡만. 확실하지 않으면 더 확실한 곡으로 바꾼다. 지어내지 않는다.',
      '한 모드 안에서 곡마다 다른 아티스트.',
    ]),
    section('[자주 나오는 곡]', [
      `아래 곡은 감정과 상관없이 너무 자주 골라졌다. 이 글에 특별히 잘 맞는 경우가 아니면 고르지 않는다: ${DEFAULT_SONGS.map((s) => `${s.artist} - ${s.title}`).join(', ')}`,
    ]),
    section('[표기]', [
      'title 은 원곡 제목만(Remix·Live·연도·부제 표기 금지).',
      'artist·title 은 Apple Music에 등록된 공식 표기 그대로 쓴다. 음차·번역·옛 이름 금지(10CM을 "십센치"로, AKMU를 "악동뮤지션"으로 쓰지 않는다). 한글로 등록된 곡명은 한글 그대로.',
    ]),
  ].join('\n\n');
}

const TRACK = {
  type: 'object',
  additionalProperties: false,
  required: ['artist', 'title', 'region'],
  properties: {
    artist: { type: 'string' },
    title: { type: 'string' },
    region: { type: 'string', enum: Object.keys(PICKS_PER_MODE.immerse) },
  },
};

/** 속성 순서가 생성 순서다 — 화면에 먼저 쓰는 값(감정·위기·공감 문구)이 곡보다 앞 */
export function buildPickFormat() {
  const properties = {
    emotion: { type: 'string', enum: EMOTIONS },
    crisis: { type: 'boolean' },
    description: { type: 'string' },
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
