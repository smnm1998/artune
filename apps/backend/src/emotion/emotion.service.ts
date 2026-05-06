import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { SpotifyService } from '../spotify/spotify.service';
import { DalleService } from '../dalle/dalle.service';
import { mapToFrontendTrack } from '../spotify/utils/track-mapper.util';
import {
  IMMERSE_DESCRIPTIONS,
  SOOTHE_DESCRIPTIONS,
  DEFAULT_IMMERSE_DESCRIPTION,
  DEFAULT_SOOTHE_DESCRIPTION,
} from './constants/emotion-descriptions.constant';

/**
 * Emotion Service - Orchestrator
 * OpenAI, Spotify, DALLE 서비스를 조합하여 감정 기반 추천 시스템 구현
 */
@Injectable()
export class EmotionService {
  constructor(
    private readonly openAIService: OpenAIService,
    private readonly spotifyService: SpotifyService,
    private readonly dalleService: DalleService,
  ) {}

  /**
   * 감정에 따른 immerse 모드 설명 생성
   *
   * @param {string} emotionLabel - 감정 라벨 (예: '기쁨', '슬픔')
   * @returns {string} immerse 모드 설명
   */
  getImmerseDescription(emotionLabel) {
    return (
      IMMERSE_DESCRIPTIONS[emotionLabel] ||
      DEFAULT_IMMERSE_DESCRIPTION(emotionLabel)
    );
  }

  /**
   * 감정에 따른 soothe 모드 설명 생성
   *
   * @param {string} emotionLabel - 감정 라벨
   * @returns {string} soothe 모드 설명
   */
  getSootheDescription(emotionLabel) {
    return (
      SOOTHE_DESCRIPTIONS[emotionLabel] ||
      DEFAULT_SOOTHE_DESCRIPTION(emotionLabel)
    );
  }

  /**
   * 텍스트 분석 -> 감정 및 추천 음악 & 픽셀아트 디저트 이미지 생성
   *
   * @param {string} text - 분석할 사용자 입력 텍스트
   * @returns {Promise<Object>} 프론트엔드 형식의 응답
   * @throws {BadRequestException} 빈 텍스트가 입력된 경우
   *
   * 흐름:
   * 1. OpenAI로 감정 분석 - {emotion, emotionLabel, immerse, soothe}
   * 2. Spotify로 음악 추천 (immerse, soothe 각각)
   * 3. DALLE로 디저트 이미지 생성
   * 4. 프론트엔드 형식으로 변환하여 반환
   */
  async analyzeAndRecommend(text) {
    if (!text || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 필요합니다.');
    }

    // 1. OpenAI로 감정 분석
    const emotion = await this.openAIService.analyzeEmotion(text);

    // 2. Spotify 음악 추천 - immerse (병렬 처리)
    const [immerseRecommendations, sootheRecommendations, dessertImage] =
      await Promise.all([
        // immerse 플레이리스트
        this.spotifyService.getRecommendations(
          emotion.immerse.genres,
          emotion.immerse.valence,
          emotion.immerse.energy,
          emotion.immerse.tempo,
        ),
        // soothe 플레이리스트
        this.spotifyService.getRecommendations(
          emotion.soothe.genres,
          emotion.soothe.valence,
          emotion.soothe.energy,
          emotion.soothe.tempo,
        ),
        // DALLE 디저트 이미지
        this.dalleService.generateDessertImage(
          emotion.emotion,
          emotion.emotionLabel,
          emotion.immerse.genres,
        ),
      ]);

    // 3. 프론트엔드 형식으로 변환
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
          tracks: immerseRecommendations.map(mapToFrontendTrack),
        },
        soothe: {
          modeLabel: '감정 완화',
          description: this.getSootheDescription(emotion.emotionLabel),
          tracks: sootheRecommendations.map(mapToFrontendTrack),
        },
      },
    };
  }

  /**
   * 텍스트 분석 -> 감정 및 추천 음악 & 픽셀아트 디저트 이미지 생성 (진행률 콜백 포함)
   *
   * @param {string} text - 분석할 사용자 입력 텍스트
   * @param {Function} onProgress - 진행률 콜백 함수 (progress: number, message: string)
   * @returns {Promise<Object>} 프론트엔드 형식의 응답
   * @throws {BadRequestException} 빈 텍스트가 입력된 경우
   *
   * - 병렬 처리(Promise.all)를 제거하고 순차 처리(await)로 변경
   * - 진행률이 뒤섞이지 않고 차근차근 오르도록 보장
   */
  async analyzeAndRecommendWithProgress(text, onProgress) {
    if (!text || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 필요합니다.');
    }

    // 시작 (0%)
    onProgress(0, '감정 분석을 시작합니다...');

    // OpenAI로 감정 분석 (10%~30%)
    onProgress(10, '감정을 분석하고 있어요...');
    const emotion = await this.openAIService.analyzeEmotion(text);
    onProgress(30, '음악 추천을 준비하고 있어요...');

    // Spotify 음악 추천 - 감정 심취 (40% -> 60%)
    onProgress(40, '당신의 감정에 맞는 음악을 찾고 있어요...');
    const immerseRecommendations = await this.spotifyService.getRecommendations(
      emotion.immerse.genres,
      emotion.immerse.valence,
      emotion.immerse.energy,
      emotion.immerse.tempo,
    );

    onProgress(60, '플레이리스트를 만들기 시작했어요...');

    // Spotify 음악 추천 - 감정 완화 (60% -> 80%)
    const sootheRecommendations = await this.spotifyService.getRecommendations(
      emotion.soothe.genres,
      emotion.soothe.valence,
      emotion.soothe.energy,
      emotion.soothe.tempo,
    );

    onProgress(80, '플레이리스트를 만드는 중이에요...');

    // DALLE 디저트 이미지 생성 (80% -> 95%)
    const dessertImage = await this.dalleService.generateDessertImage(
      emotion.emotion,
      emotion.emotionLabel,
      emotion.immerse.genres,
    );

    onProgress(95, '특별한 디저트를 준비했어요...');

    // 6. 전체 완료 (100%)
    onProgress(100, '완료!');

    // 프론트엔드 형식으로 변환 및 반환
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
          tracks: immerseRecommendations.map(mapToFrontendTrack),
        },
        soothe: {
          modeLabel: '감정 완화',
          description: this.getSootheDescription(emotion.emotionLabel),
          tracks: sootheRecommendations.map(mapToFrontendTrack),
        },
      },
    };
  }
}
