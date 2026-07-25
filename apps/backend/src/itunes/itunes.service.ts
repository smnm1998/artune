import { deduplicateByTrackId } from '../music/utils/track-filter.util';
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ITunesTrack } from './itunes-track.type';
import { titleMatches } from './track-title-match.util';
import { Cache } from 'cache-manager';
import axios from 'axios';

type FetchResult =
  | { status: 'ok'; tracks: ITunesTrack[] }
  | { status: 'empty' }
  | { status: 'throttled' }
  | { status: 'error' };

export interface TrackQuery {
  artist: string;
  title: string;
}

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

  /**
   * 다수 항목을 병렬 배치로 해석하되, 각 항목의 메타데이터(region/match 등)를 보존한다.
   * @param items 해석할 항목들
   * @param toQuery 항목 → (artist, title) 추출 함수
   * @returns 해석 성공한 { item, track } 쌍만 (실패분 제외)
   */
  async resolveMany<T>(
    items: T[],
    toQuery: (item: T) => TrackQuery,
  ): Promise<Array<{ item: T; track: ITunesTrack }>> {
    const out: Array<{ item: T; track: ITunesTrack }> = [];

    for (let i = 0; i < items.length; i += this.CONCURRENCY) {
      const batch = items.slice(i, i + this.CONCURRENCY);
      const tracks = await Promise.all(
        batch.map((item) => this.resolveTrack(toQuery(item))),
      );
      batch.forEach((item, j) => {
        const track = tracks[j];
        if (track) out.push({ item, track });
      });

      if (i + this.CONCURRENCY < items.length) {
        await this.delay(this.BATCH_DELAY_MS);
      }
    }

    return out;
  }

  /**
   * LLM이 지정한 (아티스트, 곡) 쌍을 iTunes 재생 가능 트랙으로 해석
   * 곡명 대조로 조용한 실패(엉뚱한 곡 반환)를 폐기. 캐시 적용.
   * @returns 해석 성공 시 ITunesTrack, 실패 시 null
   */
  async resolveTrack({
    artist,
    title,
  }: TrackQuery): Promise<ITunesTrack | null> {
    const bucket = this.getCurrentBucket();
    const cacheKey = `resolve:${artist}:${title}:${bucket}`;

    const cached = await this.cacheManager.get<ITunesTrack | null>(cacheKey);
    if (cached !== undefined) return cached;

    let sawTransientFailure = false;

    for (const country of ITunesService.COUNTRIES) {
      const result = await this.fetchByQuery(`${artist} ${title}`, country);

      if (result.status === 'ok') {
        // 곡명이 일치하는 첫 후보 채택 (조용한 실패 방어)
        const matched = result.tracks.find((t) =>
          titleMatches(title, t.trackName),
        );
        if (matched) {
          await this.cacheManager.set(cacheKey, matched);
          return matched;
        }
        // 응답은 왔으나 곡명 불일치 → 다른 국가에서 재시도
        continue;
      }

      if (result.status === 'throttled') return null;
      if (result.status === 'error') sawTransientFailure = true;
    }

    // 일시적 실패가 아니었다면 '해석 불가'로 확정 캐시 (반복 조회 방지)
    if (!sawTransientFailure) {
      await this.cacheManager.set(cacheKey, null);
    }
    return null;
  }

  private async fetchByQuery(
    term: string,
    country: string,
  ): Promise<FetchResult> {
    // 자유텍스트 검색 (attribute 없음) — "아티스트 곡명" 형태 해석용
    return this.fetchTracks({
      term,
      media: 'music',
      entity: 'song',
      limit: 3,
      country,
    });
  }

  private async fetchByArtist(
    artist: string,
    limit: number,
    country: string,
  ): Promise<FetchResult> {
    return this.fetchTracks({
      term: artist,
      attribute: 'artistTerm',
      media: 'music',
      entity: 'song',
      limit,
      country,
    });
  }

  private async fetchTracks(
    params: Record<string, string | number>,
  ): Promise<FetchResult> {
    try {
      const response = await axios.get(ITunesService.BASE_URL, {
        params,
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
