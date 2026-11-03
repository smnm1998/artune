import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ITunesTrack } from './itunes-track.type';
import { selectTrack } from './track-select.util';
import { Cache } from 'cache-manager';
import axios from 'axios';

type FetchResult =
  | { status: 'ok'; tracks: ITunesTrack[] }
  | { status: 'empty' }
  | { status: 'throttled' }
  | { status: 'error' };

// 해석 결과 — throttle·네트워크 오류(transient)는 캐시하지 않고 다음 요청에서 재시도
type Resolution =
  | { status: 'done'; track: ITunesTrack | null }
  | { status: 'transient' };

export interface TrackQuery {
  artist: string;
  title: string;
}

@Injectable()
export class ITunesService {
  static readonly SEARCH_URL = 'https://itunes.apple.com/search';
  static readonly LOOKUP_URL = 'https://itunes.apple.com/lookup';
  // 11/3 실측: limit 5와 10의 정답률 차이 없음, 3은 원곡이 Live·Remix 뒤로 밀려 손해
  static readonly SEARCH_LIMIT = 5;
  private static readonly HANGUL = /[가-힣]/;
  private static readonly JAPANESE = /[ぁ-んァ-ン一-龯]/;
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
   * 곡명·아티스트를 모두 대조해 조용한 실패(커버·MR·엉뚱한 곡)를 폐기. 캐시 적용.
   * @returns 해석 성공 시 ITunesTrack(US 스토어 표기), 실패 시 null
   */
  async resolveTrack(query: TrackQuery): Promise<ITunesTrack | null> {
    const cacheKey = `resolve:${query.artist}:${query.title}`;

    const cached = await this.cacheManager.get<ITunesTrack | null>(cacheKey);
    if (cached !== undefined) return cached;

    const resolution = await this.findTrack(query);
    if (resolution.status === 'transient') return null;

    // 해석 불가(null)도 확정 캐시 (반복 조회 방지)
    await this.cacheManager.set(cacheKey, resolution.track);
    return resolution.track;
  }

  /**
   * 최종 곡을 KR 스토어 버전(한글 곡명·아티스트명, KR 스토어 링크)으로 바꾼다. 요청당 lookup 1회.
   * KR 스토어에 없거나 미리듣기가 없는 곡, 조회 실패 시에는 원래 트랙을 그대로 쓴다.
   */
  async localizeTracks(tracks: ITunesTrack[]): Promise<ITunesTrack[]> {
    if (tracks.length === 0) return tracks;

    const result = await this.lookup(
      tracks.map((t) => t.trackId),
      'kr',
    );
    if (result.status !== 'ok') return tracks;

    const kr = new Map(result.tracks.map((t) => [t.trackId, t]));
    return tracks.map((t) => {
      const localized = kr.get(t.trackId);
      return localized?.previewUrl ? localized : t;
    });
  }

  /**
   * US 검색 → (요청에 한글·일본어가 있으면) KR·JP 표기 lookup → (일본 곡이면) JP 검색 순으로 대조.
   * KR 스토어 검색은 결과가 항상 0건이라 쓰지 않는다 (11/3 실측, lookup은 정상).
   */
  private async findTrack(query: TrackQuery): Promise<Resolution> {
    const term = `${query.artist} ${query.title}`;
    const text = query.artist + query.title;

    const us = await this.search(term, 'us');
    if (us.status === 'throttled' || us.status === 'error') {
      return { status: 'transient' };
    }
    const usTracks = us.status === 'ok' ? us.tracks : [];

    // 1차: US 표기만으로 대조 — 팝은 대부분 여기서 끝난다
    const fromUs = selectTrack(query, this.asCandidates(usTracks));
    if (fromUs) return { status: 'done', track: fromUs };

    // 2차: 현지화 표기 대조 (US 'Good Day / IU' ↔ KR '좋은 날 / 아이유') — 필요한 스토어만 lookup
    const stores = [
      ...(ITunesService.HANGUL.test(text) ? ['kr'] : []),
      ...(ITunesService.JAPANESE.test(text) ? ['jp'] : []),
    ];
    if (usTracks.length > 0 && stores.length > 0) {
      const results = await Promise.all(
        stores.map((country) =>
          this.lookup(
            usTracks.map((t) => t.trackId),
            country,
          ),
        ),
      );
      if (
        results.some((r) => r.status === 'throttled' || r.status === 'error')
      ) {
        return { status: 'transient' };
      }
      const localized = results.flatMap((r) =>
        r.status === 'ok' ? r.tracks : [],
      );
      const fromLocalized = selectTrack(
        query,
        usTracks.map((t) => ({
          track: t,
          names: [t, ...localized.filter((l) => l.trackId === t.trackId)],
        })),
      );
      if (fromLocalized) return { status: 'done', track: fromLocalized };
    }

    // 3차: US 스토어에 없는 일본 곡 (スピッツ, ONE OK ROCK 초기곡 등) — JP 검색은 정상 동작
    if (ITunesService.JAPANESE.test(text)) {
      const jp = await this.search(term, 'jp');
      if (jp.status === 'throttled' || jp.status === 'error') {
        return { status: 'transient' };
      }
      const jpTracks = jp.status === 'ok' ? jp.tracks : [];
      return {
        status: 'done',
        track: selectTrack(query, this.asCandidates(jpTracks)),
      };
    }

    return { status: 'done', track: null };
  }

  private asCandidates(tracks: ITunesTrack[]) {
    return tracks.map((t) => ({ track: t, names: [t] }));
  }

  private async search(term: string, country: string): Promise<FetchResult> {
    // 자유텍스트 검색 (attribute 없음) — "아티스트 곡명" 형태 해석용
    const result = await this.request(ITunesService.SEARCH_URL, {
      term,
      media: 'music',
      entity: 'song',
      limit: ITunesService.SEARCH_LIMIT,
      country,
    });
    if (result.status !== 'ok') return result;
    const tracks = this.filterQualityTracks(result.tracks);
    return tracks.length > 0 ? { status: 'ok', tracks } : { status: 'empty' };
  }

  private lookup(ids: number[], country: string): Promise<FetchResult> {
    // 같은 trackId를 다른 스토어에서 조회 — 없는 곡은 결과에서 빠진다
    return this.request(ITunesService.LOOKUP_URL, {
      id: ids.join(','),
      country,
    });
  }

  private async request(
    url: string,
    params: Record<string, string | number>,
  ): Promise<FetchResult> {
    try {
      const response = await axios.get(url, { params, timeout: 8000 });
      const tracks = (response.data.results ?? []) as ITunesTrack[];
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
