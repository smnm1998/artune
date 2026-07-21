import { Injectable, Logger } from '@nestjs/common';
import { ITunesService } from '../itunes/itunes.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import { ensureArtistDiversity } from './utils/artist-diversity.util';
import { shuffleArray } from './utils/track-filter.util';
import { matchesGenres, preferMatchingGenres } from './utils/genre-match.util';

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private readonly TARGET_COUNT = 20;
  private readonly INITIAL_FETCH = 20;
  private readonly FALLBACK_FETCH = 10;

  constructor(private readonly itunesService: ITunesService) {}

  async getRecommendations(
    artists: string[],
    genres: string[] = [],
  ): Promise<ITunesTrack[]> {
    if (!artists || artists.length === 0) return [];

    // 1. 아티스트 풀 → shuffle → 상위 20명 추출
    const shuffledPool = shuffleArray(artists);
    const selected = shuffledPool.slice(0, this.INITIAL_FETCH);

    // 2. iTunes 트랙 조회 (throttled + 아티스트별 캐시)
    let tracks = await this.itunesService.getTracksForArtists(selected);

    // 3. 결과 부족 시 풀 나머지에서 보충
    if (tracks.length < this.TARGET_COUNT) {
      const remaining = shuffledPool.slice(
        this.INITIAL_FETCH,
        this.INITIAL_FETCH + this.FALLBACK_FETCH,
      );
      const fallbackTracks =
        await this.itunesService.getTracksForArtists(remaining);
      tracks = [...tracks, ...fallbackTracks];
    }

    // 4. 셔플 → 모드 장르 매칭 트랙 우선 배치(소프트 필터) → 다양성 적용 (1곡/아티스트)
    const shuffledTracks = shuffleArray(tracks);
    const genrePreferred = preferMatchingGenres(shuffledTracks, genres);
    const result = ensureArtistDiversity(genrePreferred, this.TARGET_COUNT, 1);

    if (genres.length > 0) {
      const matchedCount = result.filter((track) =>
        matchesGenres(track, genres),
      ).length;
      // 라벨 분포 top 4 — 별칭 사전 튜닝용 (매칭 실패 원인 즉시 확인)
      const labelCounts = new Map<string, number>();
      for (const track of result) {
        const label = track.primaryGenreName ?? '(none)';
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      }
      const topLabels = [...labelCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label, count]) => `${label}:${count}`)
        .join(',');
      this.logger.log(
        `[genre-match] matched=${matchedCount}/${result.length} genres=${genres.join(',')} labels=${topLabels}`,
      );
    }

    return result;
  }
}
