import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SpotifyService } from './music.service';
import { ITunesService } from '../itunes/itunes.service.js';
import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';

jest.mock('spotify-web-api-node');
jest.mock('axios');

describe('SpotifyService', () => {
  let service;
  let configService;
  let itunesService;
  let mockSpotifyApi;

  beforeEach(async () => {
    mockSpotifyApi = {
      setAccessToken: jest.fn(),
      getAccessToken: jest.fn(() => 'test-access-token'),
      clientCredentialsGrant: jest.fn(),
    };

    SpotifyWebApi.mockImplementation(() => mockSpotifyApi);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SpotifyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                SPOTIFY_CLIENT_ID: 'test-client-id',
                SPOTIFY_CLIENT_SECRET: 'test-client-secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: ITunesService,
          useValue: {
            getPreviewUrlsBatch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SpotifyService);
    configService = moduleRef.get(ConfigService);
    itunesService = moduleRef.get(ITunesService);

    mockSpotifyApi.clientCredentialsGrant.mockResolvedValue({
      body: {
        access_token: 'test-access-token',
        expires_in: 3600,
      },
    });

    // 각 테스트마다 authenticated 초기화
    service.authenticated = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('유효한 파라미터로 추천 트랙을 반환해야 한다.', async () => {
      const genres = ['pop', 'dance'];
      const valence = 0.8;
      const energy = 0.7;
      const tempo = 120;

      // Mock 1: 아티스트 검색 응답 (pop)
      const mockArtistSearchPop = {
        data: {
          artists: {
            items: [
              {
                id: 'artist-1',
                name: 'Artist 1',
                popularity: 80,
              },
            ],
          },
        },
      };

      // Mock 2: 아티스트 검색 응답 (dance)
      const mockArtistSearchDance = {
        data: {
          artists: {
            items: [
              {
                id: 'artist-2',
                name: 'Artist 2',
                popularity: 75,
              },
            ],
          },
        },
      };

      // Mock 3: Top Tracks 응답 (artist-1)
      const mockTopTracksArtist1 = {
        data: {
          tracks: [
            {
              id: '1',
              name: 'Happy Song',
              artists: [{ name: 'Artist 1', id: 'artist-1' }],
              album: {
                id: 'album-1',
                name: 'Album 1',
                images: [{ url: 'image-url' }],
                total_tracks: 10,
                release_date: '2023-01-01',
                external_urls: { spotify: 'album-spotify-url' },
              },
              preview_url: null,
              external_urls: { spotify: 'spotify-url' },
              popularity: 95,
              duration_ms: 180000,
            },
          ],
        },
      };

      // Mock 4: Top Tracks 응답 (artist-2)
      const mockTopTracksArtist2 = {
        data: {
          tracks: [
            {
              id: '2',
              name: 'Dance Song',
              artists: [{ name: 'Artist 2', id: 'artist-2' }],
              album: {
                id: 'album-2',
                name: 'Album 2',
                images: [{ url: 'image-url-2' }],
                total_tracks: 12,
                release_date: '2023-02-01',
                external_urls: { spotify: 'album-spotify-url-2' },
              },
              preview_url: null,
              external_urls: { spotify: 'spotify-url-2' },
              popularity: 90,
              duration_ms: 200000,
            },
          ],
        },
      };

      // iTunes API 모킹
      const mockItunesPreviewMap = new Map([
        ['1', 'https://audio-ssl.itunes.apple.com/preview.m4a'],
        ['2', 'https://audio-ssl.itunes.apple.com/preview2.m4a'],
      ]);
      itunesService.getPreviewUrlsBatch.mockResolvedValue(mockItunesPreviewMap);

      // axios.get 호출 순서:
      // 1. searchArtistsByGenre('pop')
      // 2. searchArtistsByGenre('dance')
      // 3. getArtistTopTracks('artist-1')
      // 4. getArtistTopTracks('artist-2')
      axios.get
        .mockResolvedValueOnce(mockArtistSearchPop) // 1. pop 아티스트 검색
        .mockResolvedValueOnce(mockArtistSearchDance) // 2. dance 아티스트 검색
        .mockResolvedValueOnce(mockTopTracksArtist1) // 3. artist-1 Top Tracks
        .mockResolvedValueOnce(mockTopTracksArtist2); // 4. artist-2 Top Tracks

      const result = await service.getRecommendations(
        genres,
        valence,
        energy,
        tempo,
      );

      // 최소 1개 이상 반환 확인 (필터링 결과에 따라 달라질 수 있음)
      expect(result.length).toBeGreaterThanOrEqual(1);

      // 첫 번째 트랙 검증
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('album');
      expect(result[0].album).toHaveProperty('name');
      expect(result[0].album).toHaveProperty('totalTracks');
      expect(result[0]).toHaveProperty('popularity');
      expect(result[0]).toHaveProperty('previewUrl');

      expect(itunesService.getPreviewUrlsBatch).toHaveBeenCalled();
    });

    it('빈 장르 배열이 입력되면 에러를 던져야 한다.', async () => {
      await expect(
        service.getRecommendations([], 0.5, 0.5, 120),
      ).rejects.toThrow('장르는 최소 1개 이상이 필요합니다.');
    });

    it('valence가 0~1 범위를 벗어나면 에러를 던져야 한다.', async () => {
      await expect(
        service.getRecommendations(['pop'], 1.5, 0.5, 120),
      ).rejects.toThrow('valence는 0~1 사이여야 합니다.');

      await expect(
        service.getRecommendations(['pop'], -0.1, 0.5, 120),
      ).rejects.toThrow('valence는 0~1 사이여야 합니다.');
    });

    it('energy가 0~1 범위를 벗어나면 에러를 던져야 한다.', async () => {
      await expect(
        service.getRecommendations(['pop'], 0.5, 1.5, 120),
      ).rejects.toThrow('energy는 0~1 사이여야 합니다.');
    });

    it('tempo가 유효하지 않으면 에러를 던져야 한다.', async () => {
      await expect(
        service.getRecommendations(['pop'], 0.5, 0.5, -10),
      ).rejects.toThrow('tempo는 0보다 커야 합니다.');
    });

    it('Spotify API 호출 실패 시 에러를 던져야 한다.', async () => {
      // Given: 아티스트 검색 API 실패
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      // When & Then: 에러를 던져야 함
      await expect(
        service.getRecommendations(['pop'], 0.5, 0.5, 120),
      ).rejects.toThrow('Spotify API 호출 실패');
    });

    it('액세스 토큰이 만료되면 자동으로 갱신해야 한다.', async () => {
      const genres = ['pop'];

      // Mock: 아티스트 검색 응답
      const mockArtistSearchResponse = {
        data: {
          artists: {
            items: [
              {
                id: 'artist-1',
                name: 'Popular Artist',
                popularity: 80,
              },
            ],
          },
        },
      };

      // Mock: 아티스트의 Top Tracks 응답
      const mockTopTracksResponse = {
        data: {
          tracks: [
            {
              id: 'track-1',
              name: 'Popular Song',
              artists: [{ name: 'Popular Artist', id: 'artist-1' }],
              album: {
                id: 'album-1',
                name: 'Album',
                images: [{ url: 'image.jpg' }],
                total_tracks: 10,
                release_date: '2024-01-01',
                external_urls: { spotify: 'album-url' },
              },
              preview_url: null,
              external_urls: { spotify: 'track-url' },
              popularity: 90,
              duration_ms: 180000,
            },
          ],
        },
      };

      itunesService.getPreviewUrlsBatch.mockResolvedValue(
        new Map([['track-1', 'https://itunes.apple.com/preview.m4a']]),
      );

      // 첫 번째 호출 (아티스트 검색): 401 에러
      // 두 번째 호출 (재시도 - 아티스트 검색): 성공
      // 세 번째 호출 (Top Tracks): 성공
      axios.get
        .mockRejectedValueOnce(
          (() => {
            const error = new Error('Unauthorized');
            error.response = { status: 401 };
            return error;
          })(),
        )
        .mockResolvedValueOnce(mockArtistSearchResponse)
        .mockResolvedValueOnce(mockTopTracksResponse);

      await service.getRecommendations(genres, 0.5, 0.5, 120);

      // 초기 1회 + 401 에러 후 재갱신 1회 = 총 2회
      expect(mockSpotifyApi.clientCredentialsGrant).toHaveBeenCalledTimes(2);
    });
  });
});
