import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { MusicService } from '../music/music.service';
import { DalleService } from '../dalle/dalle.service';
import { mapItunesTrackToFrontend } from '../music/utils/track-mapper.util';
import {
  IMMERSE_DESCRIPTIONS,
  SOOTHE_DESCRIPTIONS,
  DEFAULT_IMMERSE_DESCRIPTION,
  DEFAULT_SOOTHE_DESCRIPTION,
} from './constants/emotion-descriptions.constant';

/**
 * Emotion Service - Orchestrator
 * OpenAI, iTunes, DALLE 서비스를 조합하여 감정 기반 추천 시스템 구현
 */
@Injectable()
export class EmotionService {
  private readonly logger = new Logger(EmotionService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly musicService: MusicService,
    private readonly dalleService: DalleService,
  ) {}

  getImmerseDescription(emotionLabel) {
    return (
      IMMERSE_DESCRIPTIONS[emotionLabel] ||
      DEFAULT_IMMERSE_DESCRIPTION(emotionLabel)
    );
  }

  getSootheDescription(emotionLabel) {
    return (
      SOOTHE_DESCRIPTIONS[emotionLabel] ||
      DEFAULT_SOOTHE_DESCRIPTION(emotionLabel)
    );
  }

  private buildResponse(
    emotion,
    immerseRecommendations,
    sootheRecommendations,
    dessertImage,
  ) {
    return {
      emotionLabel: emotion.emotionLabel,
      description: emotion.description,
      artwork: {
        url: dessertImage.imageUrl,
        prompt: dessertImage.prompt,
      },
      playlists: {
        immerse: {
          modeLabel: '감정 심취',
          description: this.getImmerseDescription(emotion.emotionLabel),
          tracks: immerseRecommendations.map(mapItunesTrackToFrontend),
        },
        soothe: {
          modeLabel: '감정 완화',
          description: this.getSootheDescription(emotion.emotionLabel),
          tracks: sootheRecommendations.map(mapItunesTrackToFrontend),
        },
      },
    };
  }

  /**
   * @throws {BadRequestException} 빈 텍스트가 입력된 경우
   *
   * 흐름:
   * 1. OpenAI로 감정 분석 - {emotion, emotionLabel, immerse, soothe}
   * 2. iTunes API로 음악 추천 (immerse, soothe 병렬)
   * 3. DALLE로 디저트 이미지 생성
   * 4. 프론트엔드 형식으로 변환하여 반환
   */
  async analyzeAndRecommend(text) {
    if (!text || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 필요합니다.');
    }

    const t0 = Date.now();

    // 1. OpenAI로 감정 분석
    const emotion = await this.openAIService.analyzeEmotion(text);
    const tOpenAI = Date.now();

    // 2. 음악 추천 - immerse (병렬 처리)
    const [immerseRecommendations, sootheRecommendations, dessertImage] =
      await Promise.all([
        this.musicService.getRecommendations(emotion.immerse.artists),
        this.musicService.getRecommendations(emotion.soothe.artists),
        // DALLE 디저트 이미지
        this.dalleService.generateDessertImage(
          emotion.emotion,
          emotion.emotionLabel,
          emotion.immerse.genres,
        ),
      ]);
    const tEnd = Date.now();

    this.logger.log(
      `[timing] path=parallel total=${tEnd - t0}ms ` +
        `openai=${tOpenAI - t0}ms parallel_block=${tEnd - tOpenAI}ms ` +
        `tracks=${immerseRecommendations.length}/${sootheRecommendations.length}`,
    );

    // 3. 프론트엔드 형식으로 변환
    return this.buildResponse(
      emotion,
      immerseRecommendations,
      sootheRecommendations,
      dessertImage,
    );
  }

  /**
   * @throws {BadRequestException} 빈 텍스트가 입력된 경우
   *
   * 추천/이미지 생성은 병렬 처리하되, 진행률은 "완료 카운트 → 마일스톤" 매핑으로
   * 방출해 어떤 작업이 먼저 끝나도 단조 증가를 보장 (프론트 Math.max 가드와 이중 안전망)
   */
  async analyzeAndRecommendWithProgress(text, onProgress) {
    if (!text || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 필요합니다.');
    }

    const t0 = Date.now();

    // 시작 (0%)
    onProgress(0, '감정 분석을 시작합니다...');

    // OpenAI로 감정 분석 (10%~30%)
    onProgress(10, '감정을 분석하고 있어요...');
    const emotion = await this.openAIService.analyzeEmotion(text);
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
          this.musicService.getRecommendations(emotion.immerse.artists),
        ),
        withProgress(
          this.musicService.getRecommendations(emotion.soothe.artists),
        ),
        withProgress(
          this.dalleService.generateDessertImage(
            emotion.emotion,
            emotion.emotionLabel,
            emotion.immerse.genres,
          ),
        ),
      ]);
    const tEnd = Date.now();

    this.logger.log(
      `[timing] path=sse total=${tEnd - t0}ms ` +
        `openai=${tOpenAI - t0}ms ` +
        `parallel_block=${tEnd - tOpenAI}ms ` +
        `tracks=${immerseRecommendations.length}/${sootheRecommendations.length}`,
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
