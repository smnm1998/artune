import { Test, TestingModule } from '@nestjs/testing';
import { MusicService, ModeSeeds } from './music.service';
import { ITunesService } from '../itunes/itunes.service';
import { LastfmService } from '../lastfm/lastfm.service';
import { ITunesTrack } from '../itunes/itunes-track.type';

const makeTrack = (
  trackId: number,
  artistName: string,
  overrides: Partial<ITunesTrack> = {},
): ITunesTrack => ({
  trackId,
  trackName: `Song ${trackId}`,
  artistName,
  collectionName: 'Test Album',
  artworkUrl100: 'https://test.com/100x100bb.jpg',
  trackTimeMillis: 200000,
  previewUrl: 'https://preview',
  trackViewUrl: 'https://view',
  ...overrides,
});

const emptySeeds = (): ModeSeeds => ({ korea: [], pop: [], jpop: [] });

describe('MusicService', () => {
  let service: MusicService;
  let itunesService: jest.Mocked<ITunesService>;
  let lastfmService: jest.Mocked<LastfmService>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MusicService,
        { provide: ITunesService, useValue: { resolveMany: jest.fn() } },
        {
          provide: LastfmService,
          useValue: { getSimilarTracks: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = moduleRef.get(MusicService);
    itunesService = moduleRef.get(ITunesService);
    lastfmService = moduleRef.get(LastfmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('빈 시드는 Last.fm 확장 없이 빈 결과를 반환한다.', async () => {
      itunesService.resolveMany.mockResolvedValueOnce([]);

      const result = await service.getRecommendations(emptySeeds());

      expect(result).toEqual([]);
      expect(lastfmService.getSimilarTracks).not.toHaveBeenCalled();
    });

    it('각 시드곡마다 Last.fm 유사곡을 조회한다.', async () => {
      const seeds: ModeSeeds = {
        korea: [{ artist: 'IU', title: 'Love wins all' }],
        pop: [{ artist: 'Dua Lipa', title: 'Levitating' }],
        jpop: [{ artist: 'YOASOBI', title: 'Idol' }],
      };
      itunesService.resolveMany.mockResolvedValueOnce([]);

      await service.getRecommendations(seeds);

      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith(
        'IU',
        'Love wins all',
      );
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith(
        'Dua Lipa',
        'Levitating',
      );
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith(
        'YOASOBI',
        'Idol',
      );
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledTimes(3);
    });

    it('지역 쿼터(6:3:1)로 최종 10곡을 구성한다.', async () => {
      const resolved = [
        ...Array.from({ length: 8 }, (_, i) => ({
          item: { region: 'korea' as const, match: 1 - i * 0.01 },
          track: makeTrack(i + 1, `KR ${i}`),
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          item: { region: 'pop' as const, match: 1 - i * 0.01 },
          track: makeTrack(100 + i, `POP ${i}`),
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          item: { region: 'jpop' as const, match: 1 - i * 0.01 },
          track: makeTrack(200 + i, `JP ${i}`),
        })),
      ];
      itunesService.resolveMany.mockResolvedValueOnce(resolved);

      const result = await service.getRecommendations(emptySeeds());

      expect(result).toHaveLength(10);
    });

    it('한 지역이 부족하면 다른 지역으로 보충해 10곡을 채운다 (곡 수 우선).', async () => {
      // jpop 후보 0개 → korea/pop으로 보충
      const resolved = [
        ...Array.from({ length: 12 }, (_, i) => ({
          item: { region: 'korea' as const, match: 1 - i * 0.01 },
          track: makeTrack(i + 1, `KR ${i}`),
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          item: { region: 'pop' as const, match: 1 - i * 0.01 },
          track: makeTrack(100 + i, `POP ${i}`),
        })),
      ];
      itunesService.resolveMany.mockResolvedValueOnce(resolved);

      const result = await service.getRecommendations(emptySeeds());

      expect(result).toHaveLength(10);
    });

    it('같은 아티스트는 1곡만 포함한다.', async () => {
      const resolved = [
        {
          item: { region: 'korea' as const, match: 1.0 },
          track: makeTrack(1, 'IU'),
        },
        {
          item: { region: 'korea' as const, match: 0.9 },
          track: makeTrack(2, 'IU'),
        },
        {
          item: { region: 'korea' as const, match: 0.8 },
          track: makeTrack(3, 'IU'),
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          item: { region: 'korea' as const, match: 0.7 - i * 0.01 },
          track: makeTrack(10 + i, `Unique ${i}`),
        })),
      ];
      itunesService.resolveMany.mockResolvedValueOnce(resolved);

      const result = await service.getRecommendations(emptySeeds());

      expect(result.filter((t) => t.artistName === 'IU')).toHaveLength(1);
    });
  });
});
