import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EmotionResponse, SeenHistory, Track } from '@artune/shared-types';
import { OpenAIService } from '../openai/openai.service';
import { MusicService, ServedTrack } from '../music/music.service';
import { DalleService } from '../dalle/dalle.service';
import { mapItunesTrackToFrontend } from '../music/utils/track-mapper.util';
import { HISTORY_LIMIT } from '../music/utils/freshness-order.util';
import type { PlaylistMode } from '../music/exposure-window';
import {
  IMMERSE_DESCRIPTIONS,
  SOOTHE_DESCRIPTIONS,
} from './constants/emotion-descriptions.constant';
import { Emotion, EMOTION_LABELS } from './constants/emotions.constant';
import { PickedTrack, PickResult } from '../openai/pick-prompt';
import { AsyncQueue } from './utils/async-queue.util';

/** 요청 본문이 보낸 이력 그대로 — 형식은 parseSeen이 거른다 */
export type SeenInput = Partial<Record<PlaylistMode, unknown>>;

/** 스트리밍 파이프라인이 내보내는 것 — 호출 순서가 곧 보내는 순서다 */
export interface StreamHandlers {
  onProgress?: (progress: number, message: string) => void;
  /** 감정·공감 문구·아트워크가 정해졌을 때 한 번 — 곡 목록은 비어 있다 */
  onMeta?: (meta: EmotionResponse) => void;
  /** 고른 곡 하나 — 모드별 최종 순서대로 */
  onTrack?: (mode: PlaylistMode, index: number, track: Track) => void;
  /** 취소 (연결이 끊긴 요청) — AI 생성과 해석을 멈춘다 */
  signal?: AbortSignal;
}

/**
 * Emotion Service - Orchestrator
 * OpenAI, iTunes, DALLE 서비스를 조합하여 감정 기반 추천 시스템 구현
 */
@Injectable()
export class EmotionService {
  /** 프론트 입력창과 같은 상한 — 화면 검증은 요청을 직접 보내면 우회되고, 긴 입력은 그대로 LLM 비용이 된다 */
  static readonly MAX_TEXT_LENGTH = 500;

  private readonly logger = new Logger(EmotionService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly musicService: MusicService,
    private readonly dalleService: DalleService,
  ) {}

  getImmerseDescription(emotion: Emotion) {
    return IMMERSE_DESCRIPTIONS[emotion];
  }

  getSootheDescription(emotion: Emotion) {
    return SOOTHE_DESCRIPTIONS[emotion];
  }

  /**
   * 배열에서 곡 키 형식(16진수 8자)만 남기고 최근 HISTORY_LIMIT곡으로 자른다.
   * 이력은 순서만 바꾸는 힌트라 형식이 틀린 값은 오류 대신 버린다
   */
  static parseSeen(raw: unknown): string[] {
    const values: unknown[] = Array.isArray(raw) ? raw : [];
    return values
      .filter(
        (value): value is string =>
          typeof value === 'string' && /^[0-9a-f]{8}$/.test(value),
      )
      .slice(-HISTORY_LIMIT);
  }

  /** 빈 글·상한 초과는 LLM을 부르기 전에 거절한다. 본문은 JSON이라 text가 문자열이 아닐 수도 있다 (숫자·배열) */
  private static assertText(text: unknown): asserts text is string {
    if (typeof text !== 'string' || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 필요합니다.');
    }
    if (text.trim().length > EmotionService.MAX_TEXT_LENGTH) {
      throw new BadRequestException(
        `최대 ${EmotionService.MAX_TEXT_LENGTH}자까지 입력 가능합니다.`,
      );
    }
  }

  private static parseHistory(seen: SeenInput): SeenHistory {
    return {
      immerse: EmotionService.parseSeen(seen.immerse),
      soothe: EmotionService.parseSeen(seen.soothe),
    };
  }

  private buildResponse(
    emotion: PickResult,
    immerseRecommendations: ServedTrack[],
    sootheRecommendations: ServedTrack[],
    dessertImage,
  ): EmotionResponse {
    const toTracks = (served: ServedTrack[]) =>
      served.map(({ track, key }) => mapItunesTrackToFrontend(track, key));
    return {
      emotionLabel: emotion.emotionLabel,
      description: emotion.description,
      crisis: emotion.crisis,
      artwork: {
        url: dessertImage.imageUrl,
        prompt: dessertImage.prompt,
      },
      playlists: {
        immerse: {
          modeLabel: '감정 심취',
          description: this.getImmerseDescription(emotion.emotion),
          tracks: toTracks(immerseRecommendations),
        },
        soothe: {
          modeLabel: '감정 완화',
          description: this.getSootheDescription(emotion.emotion),
          tracks: toTracks(sootheRecommendations),
        },
      },
    };
  }

  /**
   * 한 번에 받는 판 (POST /analyze) — 스트리밍 파이프라인을 이벤트 없이 돌려 최종 응답만 돌려준다
   * @throws {BadRequestException} 빈 글이거나 상한을 넘으면
   */
  analyzeAndRecommend(
    text: unknown,
    seen: SeenInput = {},
  ): Promise<EmotionResponse> {
    return this.analyzeStream(text, seen);
  }

  /**
   * 스트리밍 파이프라인 (POST analyze-stream) — AI가 곡을 쓰는 동안 해석해, 고른 곡을 하나씩 내보낸다.
   * 최종 응답은 보낸 곡을 모드별로 모은 것과 같다 (모드별 servePicksStream이 곡이 다 모인 뒤 고르는 것과 같은 결과).
   * - meta: 감정·공감 문구가 써지면(곡보다 먼저) 아트워크와 함께 한 번 — 화면 머리말
   * - track: 모드별로 고른 곡이 KR 표기까지 끝날 때마다, 최종 순서대로
   * - 진행률: 시작 0 → 분석 10 → meta 30 → 곡마다 올라 95 → 끝 100
   * - 보내는 순서: 아트워크 매핑이 비동기라 이벤트를 한 줄로 이어 붙여 meta → 곡 순서를 지킨다
   * @throws {BadRequestException} 빈 글이거나 상한을 넘으면 — 아무것도 보내기 전에
   */
  async analyzeStream(
    text: unknown,
    seen: SeenInput = {},
    {
      onProgress = () => {},
      onMeta = () => {},
      onTrack = () => {},
      signal,
    }: StreamHandlers = {},
  ): Promise<EmotionResponse> {
    EmotionService.assertText(text);
    const history = EmotionService.parseHistory(seen);
    const t0 = Date.now();
    let chain = Promise.resolve();
    const emit = (send: () => void | Promise<void>) => {
      chain = chain.then(send);
    };
    emit(() => onProgress(0, '감정 분석을 시작합니다...'));
    emit(() => onProgress(10, '감정을 분석하고 있어요...'));

    // meta: 감정이 정해지고 공감 문구가 끝나면(또는 첫 곡이 오면) 한 번
    const fields: Partial<
      Pick<PickResult, 'emotion' | 'crisis' | 'description'>
    > = {};
    let dessert: ReturnType<DalleService['generateDessertImage']> | null = null;
    let tMeta: number | null = null;
    const sendMeta = () => {
      if (dessert || !fields.emotion) return;
      tMeta = Date.now();
      const emotion = fields.emotion;
      const emotionLabel = EMOTION_LABELS[emotion];
      const image = (dessert = this.dalleService.generateDessertImage(
        emotion,
        emotionLabel,
      ));
      const head = {
        emotion,
        emotionLabel,
        crisis: fields.crisis ?? false,
        description: fields.description ?? '',
        immerse: [],
        soothe: [],
      };
      emit(async () => {
        onMeta(this.buildResponse(head, [], [], await image));
        onProgress(30, '어울리는 곡을 찾고 있어요...');
      });
    };

    // 곡: AI가 쓰는 대로 모드별 큐로 → 모드별 해석이 고른 곡을 내보낸다
    const queues = {
      immerse: new AsyncQueue<PickedTrack>(),
      soothe: new AsyncQueue<PickedTrack>(),
    };
    let sent = 0;
    let firstTrackAt: number | null = null;
    const serving = (['immerse', 'soothe'] as const).map((mode) => {
      const served = this.musicService.servePicksStream(
        queues[mode],
        mode,
        history[mode],
        {
          signal,
          onTrack: ({ track, key }, index) => {
            firstTrackAt ??= Date.now();
            const progress = Math.min(95, 30 + Math.round((65 * ++sent) / 20));
            const mapped = mapItunesTrackToFrontend(track, key);
            emit(() => {
              onTrack(mode, index, mapped);
              onProgress(progress, '곡을 찾았어요...');
            });
          },
        },
      );
      served.catch(() => {}); // 생성이 실패해 기다리지 않게 된 쪽의 거부가 처리 안 된 채 남지 않게
      return served;
    });

    let picked: PickResult;
    try {
      picked = await this.openAIService.pickSongsStream(text, {
        signal,
        onField: (key, value) => {
          if (key === 'emotion') fields.emotion = value as Emotion;
          if (key === 'crisis') fields.crisis = value as boolean;
          if (key === 'description') {
            fields.description = value as string;
            sendMeta();
          }
        },
        onPick: (mode, pick) => {
          sendMeta();
          queues[mode].push(pick);
        },
      });
    } catch (error) {
      queues.immerse.fail(error);
      queues.soothe.fail(error);
      throw error;
    }
    const tOpenAI = Date.now();
    queues.immerse.end();
    queues.soothe.end();
    fields.emotion ??= picked.emotion;
    sendMeta(); // 곡·공감 문구 없이 끝난 경우에도 아트워크는 정한다

    const [immerseServed, sootheServed] = await Promise.all(serving);
    const dessertImage = await dessert!;
    const tEnd = Date.now();
    this.logger.log(
      `[timing] stream total=${tEnd - t0}ms openai=${tOpenAI - t0}ms ` +
        `meta=${tMeta != null ? tMeta - t0 : -1}ms first_track=${firstTrackAt != null ? firstTrackAt - t0 : -1}ms ` +
        `tracks=${immerseServed.length}/${sootheServed.length} ` +
        `seen=${history.immerse.length}/${history.soothe.length}`,
    );
    emit(() => onProgress(100, '완료!'));
    await chain;

    return this.buildResponse(
      picked,
      immerseServed,
      sootheServed,
      dessertImage,
    );
  }
}
