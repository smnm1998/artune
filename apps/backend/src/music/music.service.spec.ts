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

// 각 지역 1시드 (유사곡은 각 테스트에서 getSimilarTracks 목으로 주입)
const seedsPerRegion = (): ModeSeeds => ({
  korea: [{ artist: 'KRseed', title: 'k' }],
  pop: [{ artist: 'POPseed', title: 'p' }],
  jpop: [{ artist: 'JPseed', title: 'j' }],
});

// artist 이름을 받아 고유 아티스트 유사곡 n개 생성하는 목 구현
const similarFactory =
  (n: number) =>
  (artist: string) =>
    Promise.resolve(
      Array.from({ length: n }, (_, i) => ({
        artist: `${artist}-s${i}`,
        title: `t${i}`,
        match: 0.9 - i * 0.001,
      })),
    );

describe('MusicService', () => {
  let service: MusicService;
  let itunesService: jest.Mocked<ITunesService>;
  let lastfmService: jest.Mocked<LastfmService>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MusicService,
        { provide: ITunesService, useValue: { resolveTrack: jest.fn() } },
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
    it('빈 시드는 iTunes 해석 없이 빈 결과를 반환한다.', async () => {
      const result = await service.getRecommendations(emptySeeds());

      expect(result).toEqual([]);
      expect(itunesService.resolveTrack).not.toHaveBeenCalled();
      expect(lastfmService.getSimilarTracks).not.toHaveBeenCalled();
    });

    it('각 시드곡마다 Last.fm 유사곡을 조회한다.', async () => {
      itunesService.resolveTrack.mockResolvedValue(null);

      await service.getRecommendations(seedsPerRegion());

      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith('KRseed', 'k');
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith('POPseed', 'p');
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith('JPseed', 'j');
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledTimes(3);
    });

    it('지역 쿼터(6:3:1)로 최종 10곡을 구성한다.', async () => {
      lastfmService.getSimilarTracks.mockImplementation(similarFactory(10));
      let id = 0;
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(makeTrack(++id, artist)),
      );

      const result = await service.getRecommendations(seedsPerRegion());

      expect(result).toHaveLength(10);
    });

    it('해석률이 좋으면 목표(NEED)에서 조기 종료해 후보 전부를 해석하지 않는다.', async () => {
      // korea 시드 1개 + 유사곡 50개, 나머지 지역 없음
      lastfmService.getSimilarTracks.mockImplementation(similarFactory(50));
      let id = 0;
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(makeTrack(++id, artist)),
      );

      await service.getRecommendations({
        korea: [{ artist: 'K', title: 'k' }],
        pop: [],
        jpop: [],
      });

      // korea NEED=8, 배치 3 → 최대 9회에서 멈춤 (50개·CAP 12 전부 해석하지 않음)
      expect(itunesService.resolveTrack.mock.calls.length).toBeLessThanOrEqual(9);
    });

    it('한 지역이 해석 실패로 비어도 타 지역으로 보충해 10곡을 채운다.', async () => {
      lastfmService.getSimilarTracks.mockImplementation(similarFactory(15));
      let id = 0;
      // jpop 후보만 해석 실패(null)
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(artist.startsWith('JP') ? null : makeTrack(++id, artist)),
      );

      const result = await service.getRecommendations(seedsPerRegion());

      expect(result).toHaveLength(10);
    });

    it('같은 아티스트는 1곡만 포함한다.', async () => {
      // 유사곡이 전부 동일 아티스트(SoloArtist)인 상황
      lastfmService.getSimilarTracks.mockImplementation((artist: string) =>
        Promise.resolve(
          Array.from({ length: 10 }, (_, i) => ({
            artist,
            title: `t${i}`,
            match: 0.9,
          })),
        ),
      );
      let id = 0;
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(makeTrack(++id, artist)),
      );

      const result = await service.getRecommendations({
        korea: [{ artist: 'SoloArtist', title: 'x' }],
        pop: [],
        jpop: [],
      });

      expect(result.filter((t) => t.artistName === 'SoloArtist')).toHaveLength(1);
      expect(result).toHaveLength(1);
    });
  });
});
