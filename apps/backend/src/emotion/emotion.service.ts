import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EmotionResponse, SeenHistory } from '@artune/shared-types';
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
import { Emotion } from './constants/emotions.constant';
import { PickResult } from '../openai/pick-prompt';

/** 요청이 보낸 이력 그대로 — SSE 쿼리는 쉼표로 이은 문자열, POST 본문은 배열 */
export type SeenInput = Partial<Record<PlaylistMode, unknown>>;

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
   * 곡 키 형식(16진수 8자)만 남기고 최근 HISTORY_LIMIT곡으로 자른다.
   * 이력은 순서만 바꾸는 힌트라 형식이 틀린 값은 오류 대신 버린다
   */
  static parseSeen(raw: unknown): string[] {
    const values = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw.split(',')
        : [];
    return values
      .filter(
        (value): value is string =>
          typeof value === 'string' && /^[0-9a-f]{8}$/.test(value),
      )
      .slice(-HISTORY_LIMIT);
  }

  /**
   * 모드 분리도 측정 — immerse/soothe 20곡의 장르 라벨 분포 겹침 (낮을수록 두 모드가 뚜렷)
   * 인접 무드 감정(기쁨·슬픔)에서 모드가 모호해지는 문제의 정량 지표
   */
  private logModeSeparation(emotion, immerseTracks, sootheTracks) {
    const countLabels = (tracks) => {
      const counts = new Map<string, number>();
      for (const track of tracks) {
        const label = track.primaryGenreName ?? '(none)';
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      return counts;
    };

    const immerseLabels = countLabels(immerseTracks);
    const sootheLabels = countLabels(sootheTracks);
    let shared = 0;
    for (const [label, count] of immerseLabels) {
      shared += Math.min(count, sootheLabels.get(label) ?? 0);
    }
    const base = Math.min(immerseTracks.length, sootheTracks.length);
    const overlap = base > 0 ? Math.round((shared / base) * 100) : 0;

    this.logger.log(
      `[mode-separation] emotion=${emotion.emotion} overlap=${overlap}%`,
    );
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
   * SSE 경로(analyzeAndRecommendWithProgress)와 같은 파이프라인을 진행률 콜백 없이 실행한다.
   * 구현을 하나로 두어 두 경로의 동작이 어긋나지 않게 한다.
   * @throws {BadRequestException} 빈 텍스트가 입력된 경우
   */
  async analyzeAndRecommend(text, seen: SeenInput = {}) {
    return this.analyzeAndRecommendWithProgress(text, () => {}, seen);
  }

  /**
   * @throws {BadRequestException} 빈 텍스트이거나 상한을 넘는 경우
   *
   * 추천/이미지 생성은 병렬 처리하되, 진행률은 "완료 카운트 → 마일스톤" 매핑으로
   * 방출해 어떤 작업이 먼저 끝나도 단조 증가를 보장 (프론트 Math.max 가드와 이중 안전망)
   * @param seen 이 사람이 모드별로 최근 본 곡 키 — 지우지 않고 화면 순서에서 뒤로 미룬다
   */
  async analyzeAndRecommendWithProgress(
    text,
    onProgress,
    seen: SeenInput = {},
  ) {
    // 쿼리에 text가 두 번 오면 배열이다 (?text=a&text=b)
    if (typeof text !== 'string' || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 필요합니다.');
    }
    if (text.trim().length > EmotionService.MAX_TEXT_LENGTH) {
      throw new BadRequestException(
        `최대 ${EmotionService.MAX_TEXT_LENGTH}자까지 입력 가능합니다.`,
      );
    }

    const history: SeenHistory = {
      immerse: EmotionService.parseSeen(seen.immerse),
      soothe: EmotionService.parseSeen(seen.soothe),
    };
    const t0 = Date.now();

    // 시작 (0%)
    onProgress(0, '감정 분석을 시작합니다...');

    // OpenAI로 감정 분석 + 선곡 (10%~30%)
    onProgress(10, '감정을 분석하고 있어요...');
    const emotion = await this.openAIService.pickSongs(text);
    const tOpenAI = Date.now();
    onProgress(30, '음악 추천을 준비하고 있어요...');

    // 음악 추천 + 디저트 이미지 병렬 처리 (40% -> 95%)
    onProgress(40, '당신의 감정에 맞는 음악을 찾고 있어요...');

    const milestones: Array<[number, string]> = [
      [60, '플레이리스트를 만들기 시작했어요...'],
      [80, '플레이리스트를 만드는 중이에요...'],
      [95, '특별한 디저트를 준비했어요...'],
    ];
    let completedCount = 0;
    const reportCompletion = () => {
      const [progress, message] =
        milestones[Math.min(completedCount, milestones.length - 1)];
      completedCount++;
      onProgress(progress, message);
    };
    const withProgress = async <T>(promise: Promise<T>): Promise<T> => {
      const result = await promise;
      reportCompletion();
      return result;
    };

    const [immerseRecommendations, sootheRecommendations, dessertImage] =
      await Promise.all([
        withProgress(
          this.musicService.servePicks(
            emotion.immerse,
            'immerse',
            history.immerse,
          ),
        ),
        withProgress(
          this.musicService.servePicks(
            emotion.soothe,
            'soothe',
            history.soothe,
          ),
        ),
        withProgress(
          this.dalleService.generateDessertImage(
            emotion.emotion,
            emotion.emotionLabel,
          ),
        ),
      ]);
    const tEnd = Date.now();

    this.logger.log(
      `[timing] total=${tEnd - t0}ms ` +
        `openai=${tOpenAI - t0}ms ` +
        `parallel_block=${tEnd - tOpenAI}ms ` +
        `tracks=${immerseRecommendations.length}/${sootheRecommendations.length} ` +
        `seen=${history.immerse.length}/${history.soothe.length}`,
    );
    this.logModeSeparation(
      emotion,
      immerseRecommendations.map(({ track }) => track),
      sootheRecommendations.map(({ track }) => track),
    );

    // 전체 완료 (100%)
    onProgress(100, '완료!');

    // 프론트엔드 형식으로 변환 및 반환
    return this.buildResponse(
      emotion,
      immerseRecommendations,
      sootheRecommendations,
      dessertImage,
    );
  }
}
