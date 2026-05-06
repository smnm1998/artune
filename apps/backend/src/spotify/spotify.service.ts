import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';
import { filterTracks } from './utils/track-filter.util';
import { ensureArtistDiversity } from './utils/artist-diversity.util';
import { mapTracksToDTO } from './utils/track-mapper.util';
import { ITunesService } from '../itunes/itunes.service';

/**
 * Spotify Web API를 활용한 음악 추천 서비스
 * - Client Credentials Flow로 인증
 * - 감정 기반 음악 추천
 */
@Injectable()
export class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private itunesService: ITunesService;
  private authenticated: boolean;

  /**
   * @param {ConfigService} configService
   * @param {ITunesService} itunesService
   */
  constructor(
    private readonly configService: ConfigService,
    itunesService: ITunesService,
  ) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: configService.get('SPOTIFY_CLIENT_ID'),
      clientSecret: configService.get('SPOTIFY_CLIENT_SECRET'),
    });

    this.itunesService = itunesService;
    this.authenticated = false;
  }

  /**
   * Spotify API 인증
   * 액세스 토큰을 획득하고 API 클라이언트에 설정
   */
  async authenticate() {
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body.access_token);
      this.authenticated = true;
    } catch (error) {
      throw new Error(`Spotify 인증 에러: ${error.message}`);
    }
  }

  /**
   * valence와 energy 값에 따라 감정 키워드 반환
   * @param {number} valence - 긍정도
   * @param {number} energy - 에너지
   * @returns {string} 감정 키워드
   */
  getEmotionKeywords(valence, energy) {
    const getKey = (value) => {
      if (value > 0.7) return 'high';
      if (value > 0.3) return 'mid';
      return 'low';
    };

    const vKey = getKey(valence);
    const eKey = getKey(energy);

    const keywordMap = {
      'high-high': 'happy upbeat energetic',
      'high-mid': 'uplifting positive',
      'high-low': 'happy chill relaxing',
      'mid-high': 'energetic dynamic',
      'mid-mid': 'balanced moderate',
      'mid-low': 'calm peaceful',
      'low-high': 'intense powerful',
      'low-mid': 'melancholic emotional',
      'low-low': 'sad melancholic',
    };

    return keywordMap[`${vKey}-${eKey}`];
  }

  /**
   * 장르로 아티스트 검색
   * @param {string} genre - 검색할 장르
   * @param {number} limit - 가져올 아티스트 수 (기본 50)
   * @returns {Promise<Array>} 아티스트 목록
   */
  async searchArtistsByGenre(genre, limit = 50) {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const accessToken = this.spotifyApi.getAccessToken();

      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: `genre:${genre}`,
          type: 'artist',
          limit: limit,
          market: 'KR',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.artists.items;
    } catch (error) {
      // 에러를 상위로 전파 (getRecommendations에서 401 처리)
      throw error;
    }
  }

  /**
   * 아티스트의 인기 트랙 가져오기
   *
   * @param {string} artistId - 아티스트 Spotify ID
   * @returns {Promise<Array>} 인기 트랙 목록 (최대 10개)
   */
  async getArtistTopTracks(artistId) {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const accessToken = this.spotifyApi.getAccessToken();

      const response = await axios.get(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks`,
        {
          params: {
            market: 'KR',
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.tracks;
    } catch (error) {
      // 에러를 상위로 전파 (getRecommendations에서 401 처리)
      throw error;
    }
  }

  /**
   * 배열 무작위 셔플 (Fisher-Yates 알고리즘)
   *
   * @param {Array} array - 셔플할 배열
   * @returns {Array} 셔플된 새 배열
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 여러 트랙의 Audio Features를 가져옴
   *
   * @param {string[]} trackIds - 트랙 ID 배열 (최대 100개)
   * @returns {Promise<Object>} 트랙 ID별 audio features 맵
   */
  async getAudioFeatures(trackIds) {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const accessToken = this.spotifyApi.getAccessToken();
      const response = await axios.get(
        'https://api.spotify.com/v1/audio-features',
        {
          params: {
            ids: trackIds.join(','),
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const featuresMap = {};
      response.data.audio_features.forEach((features, index) => {
        if (features) {
          featuresMap[trackIds[index]] = features;
        }
      });
      return featuresMap;
    } catch (error) {
      return {};
    }
  }

  /**
   * 장르, valence, energy, tempo 기반 음악 추천 (하이브리드 방식)
   *
   * 개선 사항:
   * 1. 인기도 필터링 (최소 35 이상)
   * 2. Audio Features 기반 유사도 정렬
   * 3. 중복 트랙 제거
   * 4. 아티스트 다양성 보장
   * 5. 한국 시장 고려 (market=KR)
   *
   * @param {string[]} genres - 장르 배열 (최소 1개)
   * @param {number} valence - 긍정도 (0.0 ~ 1.0)
   * @param {number} energy - 에너지 (0.0 ~ 1.0)
   * @param {number} tempo - BPM (0 이상)
   * @returns {Promise<Array>} 추천 트랙 목록
   */
  async getRecommendations(genres, valence, energy, tempo) {
    this.validateParameters(genres, valence, energy, tempo);

    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const accessToken = this.spotifyApi.getAccessToken();

      // 장르로 아티스트 검색
      let allArtists = [];
      for (const genre of genres.slice(0, 2)) {
        const artists = await this.searchArtistsByGenre(genre, 50);
        allArtists = allArtists.concat(artists);
      }

      if (allArtists.length === 0) {
        throw new Error('Spotify API 호출 실패: 아티스트를 찾을 수 없습니다.');
      }

      // 인기 아티스트 필터링 (인기도 50 이상)
      const popularArtists = allArtists.filter(
        (artist) => artist.popularity >= 50,
      );

      // 아티스트 셔플 (다양성 보장)
      const shuffledArtists = this.shuffleArray(popularArtists);

      // 각 아티스트의 top 10 중 랜덤 1곡 선택
      const rawTracks = [];
      for (const artist of shuffledArtists.slice(0, 30)) {
        try {
          const topTracks = await this.getArtistTopTracks(artist.id);

          if (topTracks && topTracks.length > 0) {
            // top 10 중 랜덤 선택
            const randomIndex = Math.floor(
              Math.random() * Math.min(topTracks.length, 10),
            );
            rawTracks.push(topTracks[randomIndex]);
          }
        } catch (error) {
          // 401 에러는 상위로 전파, 다른 에러는 무시하고 계속
          if (error.response?.status === 401) {
            throw error;
          }
        }
      }

      // 1. 트랙 필터링 (중복 제거 + 인기도)
      const { tracks: filteredTracks, stats } = filterTracks(rawTracks, {
        minPopularity: 55,
        minResults: 40,
      });

      // 2. 인기도 순으로 정렬 (Audio Features API deprecated로 인한 변경)
      const sortedTracks = filteredTracks
        .map((track) => ({ track }))
        .sort((a, b) => b.track.popularity - a.track.popularity);

      // 3. 아티스트 다양성 보장
      const diverseTracks = ensureArtistDiversity(sortedTracks, 20, 2);

      // 4. iTunes에서 preview URL 가져오기
      const trackList = diverseTracks.map((item) => ({
        id: item.track.id,
        artistName: item.track.artists[0]?.name,
        trackName: item.track.name,
      }));

      const itunesPreviewMap =
        await this.itunesService.getPreviewUrlsBatch(trackList);

      // preview_url을 iTunes URL로 교체
      const tracksWithItunes = diverseTracks.map((item) => {
        const itunesPreview = itunesPreviewMap.get(item.track.id);
        if (itunesPreview) {
          return {
            ...item,
            track: {
              ...item.track,
              preview_url: itunesPreview,
            },
          };
        }
        return item;
      });

      // 5. DTO 매핑
      return mapTracksToDTO(tracksWithItunes.map((item) => item.track));
    } catch (error) {
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.getRecommendations(genres, valence, energy, tempo);
      }

      throw new Error(
        `Spotify API 호출 실패: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * getRecomendations 파라미터 유효성 검증
   *
   * @param {string[]} genres - 장르 배열
   * @param {number} valence - 긍정도
   * @param {number} energy - 에너지
   * @param {number} tempo - BPM
   * @throws {BadRequestException} 유효성 검증 실패 시
   */
  validateParameters(genres, valence, energy, tempo) {
    if (!genres || !Array.isArray(genres) || genres.length === 0) {
      throw new BadRequestException('장르는 최소 1개 이상이 필요합니다.');
    }

    if (typeof valence !== 'number' || valence < 0 || valence > 1) {
      throw new BadRequestException('valence는 0~1 사이여야 합니다.');
    }

    if (typeof energy !== 'number' || energy < 0 || energy > 1) {
      throw new BadRequestException('energy는 0~1 사이여야 합니다.');
    }

    if (typeof tempo !== 'number' || tempo <= 0) {
      throw new BadRequestException('tempo는 0보다 커야 합니다.');
    }
  }
}
