import { deduplicateByTrackId } from '../music/utils/track-filter.util';
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ITunesTrack } from './itunes-track.type';
import { Cache } from 'cache-manager';
import axios from 'axios';

type FetchResult =
  | { status: 'ok'; tracks: ITunesTrack[] }
  | { status: 'empty' }
  | { status: 'throttled' }
  | { status: 'error' };

@Injectable()
export class ITunesService {
  static readonly BASE_URL = 'https://itunes.apple.com/search';
  static readonly COUNTRIES = ['kr', 'us', 'jp'] as const;
  private readonly BUCKET_HOURS = 6;
  private readonly CONCURRENCY = 3;
  private readonly BATCH_DELAY_MS = 300;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * 아티스트 1명의 top track 조회 (캐시 적용)
   * 국가 순회: kr → us → jp (첫 hit에서 종료)
   */
  async getArtistTopTracks(
    artistName: string,
    limit = 3,
  ): Promise<ITunesTrack[]> {
    const bucket = this.getCurrentBucket();
    const cacheKey = `artist-tracks:${artistName}:${bucket}`;

    const cached = await this.cacheManager.get<ITunesTrack[]>(cacheKey);
    if (cached) return cached;

    let sawTransientFailure = false;

    for (const country of ITunesService.COUNTRIES) {
      const result = await this.fetchByArtist(artistName, limit, country);

      if (result.status === 'ok') {
        await this.cacheManager.set(cacheKey, result.tracks);
        return result.tracks;
      }

      // rate limit 상태에선 남은 국가 폴백이 호출만 증폭 - 즉시 중단
      if (result.status === 'throttled') return [];
      if (result.status === 'error') sawTransientFailure = true;
    }

    // 3개국 모두 '정상 응답 + 결과 없음'일 때만 빈 결과 캐시
    if (!sawTransientFailure) {
      await this.cacheManager.set(cacheKey, []);
    }
    return [];
  }

  /**
   * 다수 아티스트의 트랙 일괄 조회 (rate limit 고려한 throttled batch)
   */
  async getTracksForArtists(artists: string[]): Promise<ITunesTrack[]> {
    const results: ITunesTrack[][] = [];

    for (let i = 0; i < artists.length; i += this.CONCURRENCY) {
      const batch = artists.slice(i, i + this.CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((artist) => this.getArtistTopTracks(artist)),
      );
      results.push(...batchResults);

      if (i + this.CONCURRENCY < artists.length) {
        await this.delay(this.BATCH_DELAY_MS);
      }
    }

    return deduplicateByTrackId(results.flat());
  }

  private async fetchByArtist(
    artist: string,
    limit: number,
    country: string,
  ): Promise<FetchResult> {
    try {
      const response = await axios.get(ITunesService.BASE_URL, {
        params: {
          term: artist,
          attribute: 'artistTerm',
          media: 'music',
          entity: 'song',
          limit,
          country,
        },
        timeout: 8000,
      });
      const tracks = this.filterQualityTracks(
        (response.data.results ?? []) as ITunesTrack[],
      );
      return tracks.length > 0 ? { status: 'ok', tracks } : { status: 'empty' };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        // ITunes는 rate limit 시 429 뿐만 아니라 403도 반환 (실측 확인)
        if (status === 429 || status === 403) return { status: 'throttled' };
      }
      return { status: 'error' };
    }
  }

  private filterQualityTracks(tracks: ITunesTrack[]): ITunesTrack[] {
    const blacklist = [
      'playlist',
      'compilation',
      'various artists',
      'karaoke',
      'tribute',
      'cover',
      'best of',
      '100 songs',
      'hits',
      'greatest',
      'karaoke version',
      'originally performed by',
      'in the style of',
      'workout',
      'sleep sounds',
      'meditation',
    ];
    return tracks.filter((track) => {
      const albumName = track.collectionName?.toLowerCase() ?? '';
      const trackName = track.trackName?.toLowerCase() ?? '';
      return (
        !blacklist.some(
          (word) => albumName.includes(word) || trackName.includes(word),
        ) && track.previewUrl != null
      );
    });
  }

  private getCurrentBucket(): number {
    return Math.floor(Date.now() / (this.BUCKET_HOURS * 60 * 60 * 1000));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
