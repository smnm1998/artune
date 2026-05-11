import { Injectable } from '@nestjs/common';
import { ITunesService } from '../itunes/itunes.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import { ensureArtistDiversity } from './utils/artist-diversity.util';
import { shuffleArray } from './utils/track-filter.util';

@Injectable()
export class MusicService {
  private readonly TARGET_COUNT = 20;
  private readonly INITIAL_FETCH = 20;
  private readonly FALLBACK_FETCH = 10;

  constructor(private readonly itunesService: ITunesService) {}

  async getRecommendations(artists: string[]): Promise<ITunesTrack[]> {
    if (!artists || artists.length === 0) return [];

    // 1. 40명 풀 → shuffle → 상위 20명 추출
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

    // 4. 셔플 + 아티스트 다양성 적용 (1곡/아티스트)
    const shuffledTracks = shuffleArray(tracks);
    return ensureArtistDiversity(shuffledTracks, this.TARGET_COUNT, 1);
  }
}
