import { Injectable } from '@nestjs/common';
import { ITunesService } from 'src/itunes/itunes.service';
import { ensureArtistDiversity } from './utils/artist-diversity.util';

@Injectable()
export class MusicService {
  constructor(private readonly itunesService: ITunesService) {}

  async getRecommendations(genres: string[], keywords: string): Promise<any[]> {
    const tracks = await this.itunesService.searchTracks(keywords, genres);
    const diverse = ensureArtistDiversity(tracks, 20, 2);
    return diverse;
  }
}
