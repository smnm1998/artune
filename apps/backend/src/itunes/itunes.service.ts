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
  // 부분 문자열이 아니라 '단어' 단위로 매칭한다 (cover가 Discovery·Recovery·Undercover를 막지 않도록).
  // greatest는 정상 곡명('The Greatest')을 막아 뺐다 — 'Greatest Hits' 앨범은 hits로 걸러진다.
  // g 플래그를 쓰지 않으므로 test()를 재사용해도 lastIndex 상태가 남지 않는다.
  private static readonly BLOCKED_PATTERNS = [
    'playlist',
    'compilation',
    'various artists',
    'karaoke',
    'tribute',
    'cover',
    'best of',
    '100 songs',
    'hits',
    'originally performed by',
    'in the style of',
    'workout',
    'sleep sounds',
    'meditation',
  ].map((word) => new RegExp(`\\b${word}\\b`, 'i'));

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * LLM이 지정한 (아티스트, 곡) 쌍을 iTunes 재생 가능 트랙으로 해석
   * 곡명 대조로 조용한 실패(엉뚱한 곡 반환)를 폐기. 캐시 적용.
   * @returns 해석 성공 시 ITunesTrack, 실패 시 null
   */
  async resolveTrack({
    artist,
    title,
  }: TrackQuery): Promise<ITunesTrack | null> {
    const cacheKey = `resolve:${artist}:${title}`;

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
    const isBlocked = (text?: string) =>
      text != null &&
      ITunesService.BLOCKED_PATTERNS.some((pattern) => pattern.test(text));

    return tracks.filter(
      (track) =>
        track.previewUrl != null &&
        !isBlocked(track.collectionName) &&
        !isBlocked(track.trackName),
    );
  }
}
