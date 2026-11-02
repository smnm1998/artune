import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import axios from 'axios';

export interface SimilarTrack {
  artist: string;
  title: string;
  match: number;
}

/**
 * Last.fm API - 협업 필터링 기반 유사곡 추천
 * iTunes(카탈로그)에 없는 "추천 지능"을 보완
 * 비상업 무료 / API Key 필요 / 인증 불필요
 */
@Injectable()
export class LastfmService {
  private readonly logger = new Logger(LastfmService.name);
  static readonly BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.apiKey = configService.getOrThrow('LASTFM_API_KEY');
  }

  /**
   * 시드곡과 유사한 곡들을 협업 필터링으로 조회 (match 점수 내림차순)
   */
  async getSimilarTracks(
    artist: string,
    title: string,
    limit = 30,
  ): Promise<SimilarTrack[]> {
    const cacheKey = `lastfm-similar:${artist}:${title}`;

    const cached = await this.cacheManager.get<SimilarTrack[]>(cacheKey);
    if (cached) return cached;

    const data = await this.call('track.getSimilar', {
      artist,
      track: title,
      limit: String(limit),
      autocorrect: '1',
    });
    // 호출 실패(null)는 '유사곡 없음'이 아니다 — 캐시하면 일시 장애가 6시간 빈 결과로 굳는다
    if (!data) return [];

    const raw = data.similartracks?.track ?? [];
    const tracks: SimilarTrack[] = raw
      .filter((t: any) => t?.name && t?.artist?.name)
      .map((t: any) => ({
        artist: t.artist.name,
        title: t.name,
        match: Number(t.match) || 0,
      }));

    await this.cacheManager.set(cacheKey, tracks);
    return tracks;
  }

  private async call(
    method: string,
    params: Record<string, string>,
  ): Promise<any> {
    try {
      const response = await axios.get(LastfmService.BASE_URL, {
        params: { method, api_key: this.apiKey, format: 'json', ...params },
        timeout: 8000,
      });
      // Last.fm은 200 응답 안에 error 필드로 실패를 담기도 함
      if (response.data?.error) {
        this.logger.warn(
          `[lastfm] ${method} error ${response.data.error}: ${response.data.message}`,
        );
        return null;
      }
      return response.data;
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? `${error.response?.status ?? ''} ${error.message}`
        : String(error);
      this.logger.warn(`[lastfm] ${method} 호출 실패 ${msg}`);
      return null;
    }
  }
}
