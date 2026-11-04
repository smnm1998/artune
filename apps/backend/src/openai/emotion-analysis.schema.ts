import { EMOTIONS, Emotion } from '../emotion/constants/emotions.constant';
import type { ModeSeeds } from '../music/music.service';

/**
 * 감정 분석 LLM 응답 계약 — Structured Outputs(json_schema strict)
 *
 * strict 모드에서는 응답이 이 스키마를 벗어나지 않는다. 그래서 형태 검증 코드를 두지 않고,
 * 스키마로 표현할 수 없는 조건(시드 개수)과 스키마 밖 결과(거절·잘림)만 호출부에서 처리한다.
 * 필드 순서가 생성 순서다: 감정 → 위기 신호 → 공감 문구 → 모드별 시드.
 */
export interface ModePlan {
  keywords: string;
  genres: string[];
  seeds: ModeSeeds;
}

export interface EmotionAnalysisOutput {
  emotion: Emotion;
  crisis: boolean;
  description: string;
  immerse: ModePlan;
  soothe: ModePlan;
}

/** 서비스가 반환하는 형태 — 화면 라벨은 LLM이 아니라 enum에서 붙인다 */
export interface EmotionAnalysis extends EmotionAnalysisOutput {
  emotionLabel: string;
}

const SEED = {
  type: 'object',
  additionalProperties: false,
  required: ['artist', 'title'],
  properties: {
    artist: { type: 'string' },
    title: { type: 'string' },
  },
};

const MODE = {
  type: 'object',
  additionalProperties: false,
  required: ['keywords', 'genres', 'seeds'],
  properties: {
    keywords: { type: 'string' },
    genres: { type: 'array', items: { type: 'string' } },
    seeds: {
      type: 'object',
      additionalProperties: false,
      required: ['korea', 'pop', 'jpop'],
      properties: {
        korea: { type: 'array', items: SEED },
        pop: { type: 'array', items: SEED },
        jpop: { type: 'array', items: SEED },
      },
    },
  },
};

export const EMOTION_ANALYSIS_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'emotion_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['emotion', 'crisis', 'description', 'immerse', 'soothe'],
      properties: {
        emotion: { type: 'string', enum: EMOTIONS },
        crisis: { type: 'boolean' },
        description: { type: 'string' },
        immerse: MODE,
        soothe: MODE,
      },
    },
  },
};
