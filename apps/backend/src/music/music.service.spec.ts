import { Test, TestingModule } from '@nestjs/testing';
import { MusicService } from './music.service';
import { ITunesService } from '../itunes/itunes.service';
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

const makeArtistPool = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `Artist ${i + 1}`);

describe('MusicService', () => {
  let service: MusicService;
  let itunesService: jest.Mocked<ITunesService>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MusicService,
        {
          provide: ITunesService,
          useValue: { getTracksForArtists: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(MusicService);
    itunesService = moduleRef.get(ITunesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('빈 배열 입력 시 iTunes 호출 없이 빈 결과를 반환한다.', async () => {
      const result = await service.getRecommendations([]);

      expect(result).toEqual([]);
      expect(itunesService.getTracksForArtists).not.toHaveBeenCalled();
    });

    it('40명 풀에서 20명만 선택해 조회한다 (셔플 후 상위 20).', async () => {
      const pool = makeArtistPool(40);
      // 충분한 트랙 반환 → 보충 조회 없음
      itunesService.getTracksForArtists.mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, i) => makeTrack(i + 1, `Artist ${i + 1}`)),
      );

      await service.getRecommendations(pool);

      expect(itunesService.getTracksForArtists).toHaveBeenCalledTimes(1);
      const selected = itunesService.getTracksForArtists.mock.calls[0][0];
      expect(selected).toHaveLength(20);
      // 선택된 아티스트는 모두 풀에 속하고 중복 없음
      expect(new Set(selected).size).toBe(20);
      for (const artist of selected) {
        expect(pool).toContain(artist);
      }
    });

    it('트랙이 부족하면 풀 나머지에서 보충 조회한다.', async () => {
      const pool = makeArtistPool(25);
      itunesService.getTracksForArtists
        // 1차: 5곡뿐 (목표 20 미달)
        .mockResolvedValueOnce(
          Array.from({ length: 5 }, (_, i) => makeTrack(i + 1, `Artist A${i}`)),
        )
        // 2차(보충): 3곡
        .mockResolvedValueOnce(
          Array.from({ length: 3 }, (_, i) =>
            makeTrack(100 + i, `Artist B${i}`),
          ),
        );

      const result = await service.getRecommendations(pool);

      expect(itunesService.getTracksForArtists).toHaveBeenCalledTimes(2);

      const firstCall = itunesService.getTracksForArtists.mock.calls[0][0];
      const secondCall = itunesService.getTracksForArtists.mock.calls[1][0];
      // 보충 조회는 1차에서 안 뽑힌 나머지 아티스트 대상
      expect(firstCall).toHaveLength(20);
      expect(secondCall).toHaveLength(5); // 25 - 20
      for (const artist of secondCall) {
        expect(firstCall).not.toContain(artist);
      }

      // 1차 + 보충 트랙이 모두 결과에 반영
      expect(result).toHaveLength(8);
    });

    it('충분한 트랙이 모이면 보충 조회하지 않는다.', async () => {
      itunesService.getTracksForArtists.mockResolvedValueOnce(
        Array.from({ length: 25 }, (_, i) => makeTrack(i + 1, `Artist ${i + 1}`)),
      );

      await service.getRecommendations(makeArtistPool(40));

      expect(itunesService.getTracksForArtists).toHaveBeenCalledTimes(1);
    });

    it('모드 장르와 매칭되는 트랙을 우선 선별한다 (소프트 필터).', async () => {
      // Jazz 5곡 + Dance 19곡 = 24곡 (모두 다른 아티스트)
      const jazzTracks = Array.from({ length: 5 }, (_, i) =>
        makeTrack(i + 1, `Jazz Artist ${i}`, { primaryGenreName: 'Jazz' }),
      );
      const danceTracks = Array.from({ length: 19 }, (_, i) =>
        makeTrack(100 + i, `Dance Artist ${i}`, { primaryGenreName: 'Dance' }),
      );
      itunesService.getTracksForArtists.mockResolvedValueOnce([
        ...danceTracks,
        ...jazzTracks,
      ]);

      const result = await service.getRecommendations(makeArtistPool(40), [
        'jazz',
      ]);

      // 매칭 5곡은 전부 포함, 나머지 15곡은 비매칭으로 보충 (수율 유지)
      expect(result).toHaveLength(20);
      const jazzCount = result.filter(
        (t) => t.primaryGenreName === 'Jazz',
      ).length;
      expect(jazzCount).toBe(5);
    });

    it('아티스트당 1곡만 포함하고 최대 20곡을 반환한다.', async () => {
      // 동일 아티스트('IU') 3곡 + 서로 다른 아티스트 21곡 = 24곡
      const tracks = [
        makeTrack(1, 'IU'),
        makeTrack(2, 'IU'),
        makeTrack(3, 'IU'),
        ...Array.from({ length: 21 }, (_, i) =>
          makeTrack(10 + i, `Unique ${i}`),
        ),
      ];
      itunesService.getTracksForArtists.mockResolvedValueOnce(tracks);

      const result = await service.getRecommendations(makeArtistPool(40));

      expect(result).toHaveLength(20);
      const iuCount = result.filter((t) => t.artistName === 'IU').length;
      expect(iuCount).toBe(1);
      // 전체가 서로 다른 아티스트
      expect(new Set(result.map((t) => t.artistName)).size).toBe(20);
    });
  });
});
