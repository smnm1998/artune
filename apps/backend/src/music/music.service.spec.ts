import { Test, TestingModule } from '@nestjs/testing';
import { MusicService, ModeSeeds } from './music.service';
import { ITunesService } from '../itunes/itunes.service';
import { LastfmService } from '../lastfm/lastfm.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import { ExposureWindow } from './exposure-window';
import { songKey } from './utils/song-key.util';
import type { PickedTrack } from '../openai/pick-prompt';
import type { Region } from './utils/region-quota.util';

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
const similarFactory = (n: number) => (artist: string) =>
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
  let exposure: ExposureWindow;

  beforeEach(async () => {
    // 목록 1개부터 머리 곡을 정한다 — 기록이 다음 요청에 쓰이는지 보려고
    exposure = new ExposureWindow({ warmup: 1 });
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MusicService,
        {
          provide: ITunesService,
          useValue: {
            resolveTrack: jest.fn(),
            // 기본은 그대로 통과 — 현지화 자체는 ITunesService 테스트에서 검증
            localizeTracks: jest.fn((tracks: ITunesTrack[]) =>
              Promise.resolve(tracks),
            ),
          },
        },
        {
          provide: LastfmService,
          useValue: { getSimilarTracks: jest.fn().mockResolvedValue([]) },
        },
        { provide: ExposureWindow, useValue: exposure },
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

      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith(
        'KRseed',
        'k',
      );
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith(
        'POPseed',
        'p',
      );
      expect(lastfmService.getSimilarTracks).toHaveBeenCalledWith(
        'JPseed',
        'j',
      );
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

    it('최종 곡을 KR 스토어 표기로 바꿔 반환한다.', async () => {
      lastfmService.getSimilarTracks.mockImplementation(similarFactory(10));
      let id = 0;
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(makeTrack(++id, artist)),
      );
      itunesService.localizeTracks.mockImplementation((tracks) =>
        Promise.resolve(
          tracks.map((t) => ({ ...t, trackName: `KR ${t.trackName}` })),
        ),
      );

      const result = await service.getRecommendations(seedsPerRegion());

      // 최종 선정 후 1회만 호출
      expect(itunesService.localizeTracks).toHaveBeenCalledTimes(1);
      expect(result.every((t) => t.trackName.startsWith('KR '))).toBe(true);
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
      expect(itunesService.resolveTrack.mock.calls.length).toBeLessThanOrEqual(
        9,
      );
    });

    it('한 지역이 해석 실패로 비어도 타 지역으로 보충해 10곡을 채운다.', async () => {
      lastfmService.getSimilarTracks.mockImplementation(similarFactory(15));
      let id = 0;
      // jpop 후보만 해석 실패(null)
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(
          artist.startsWith('JP') ? null : makeTrack(++id, artist),
        ),
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

      expect(result.filter((t) => t.artistName === 'SoloArtist')).toHaveLength(
        1,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('servePicks', () => {
    // 지역별 n곡을 LLM이 고른 순서대로 (아티스트·곡명은 모두 다르다)
    const picks = (counts: Partial<Record<Region, number>>): PickedTrack[] =>
      (Object.entries(counts) as [Region, number][]).flatMap(([region, n]) =>
        Array.from({ length: n }, (_, i) => ({
          artist: `${region}-artist-${i}`,
          title: `${region} song ${i}`,
          region,
        })),
      );
    const names = (served: { track: ITunesTrack }[]) =>
      served.map(({ track }) => track.artistName);

    beforeEach(() => {
      let id = 0;
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(makeTrack(++id, artist)),
      );
    });

    it('곡마다 곡 키(곡명 기준)를 붙여 KR 표기로 돌려준다', async () => {
      const picked = picks({ korea: 7, pop: 4, jpop: 1 });
      itunesService.localizeTracks.mockImplementation((tracks) =>
        Promise.resolve(
          tracks.map((t) => ({ ...t, trackName: `KR ${t.trackName}` })),
        ),
      );

      const served = await service.servePicks(picked, 'immerse');

      expect(served).toHaveLength(10);
      expect(itunesService.localizeTracks).toHaveBeenCalledTimes(1);
      for (const { track, key } of served) {
        const pick = picked.find((p) => p.artist === track.artistName)!;
        expect(key).toBe(songKey(pick));
        expect(track.trackName.startsWith('KR ')).toBe(true);
      }
    });

    it('필요한 곡만 해석한다 — 완화 15곡이 모두 찾아지면 iTunes 해석은 10번', async () => {
      await service.servePicks(picks({ korea: 8, pop: 5, jpop: 2 }), 'soothe');

      expect(itunesService.resolveTrack).toHaveBeenCalledTimes(10);
    });

    it('LLM이 앞에 고른 곡부터 채운다 — 한국 8곡이면 앞의 6곡', async () => {
      const served = await service.servePicks(
        picks({ korea: 8, pop: 3, jpop: 1 }),
        'immerse',
      );

      const korean = names(served).filter((n) => n.startsWith('korea'));
      expect(korean.sort()).toEqual(
        [0, 1, 2, 3, 4, 5].map((i) => `korea-artist-${i}`),
      );
    });

    it('자리가 모자라면 머리 곡이 이 사람이 본 곡보다 먼저 남는다', async () => {
      // 첫 요청 화면에 나온 'korea song 0'은 머리 곡이 된다 (창의 목록 1개부터 판정)
      await service.servePicks(picks({ korea: 7, pop: 4, jpop: 1 }), 'immerse');
      const head = picks({ korea: 1 })[0];
      const pick = (title: string, region: Region = 'korea'): PickedTrack => ({
        artist: `${title}-artist`,
        title,
        region,
      });
      // 한국: 본 곡 2 · 머리 곡 1 · 처음 보는 곡 4 → 6자리 중 2자리를 머리·본 곡이 채운다 (팝·일본은 남는 곡 없음)
      const second = [
        pick('본 곡 1'),
        pick('본 곡 2'),
        head,
        ...['새 곡 1', '새 곡 2', '새 곡 3', '새 곡 4'].map((t) => pick(t)),
        ...['new pop 1', 'new pop 2', 'new pop 3'].map((t) => pick(t, 'pop')),
        pick('新しい歌', 'jpop'),
      ];

      const served = await service.servePicks(second, 'immerse', [
        songKey(second[0]),
        songKey(second[1]),
      ]);

      expect(served).toHaveLength(10);
      expect(names(served)).toContain(head.artist);
      expect(names(served)).toContain('본 곡 1-artist');
      expect(names(served)).not.toContain('본 곡 2-artist');
    });

    it('이 사람이 본 곡은 남는 후보가 있으면 화면에서 빠진다', async () => {
      const picked = picks({ korea: 7, pop: 4, jpop: 1 });

      const served = await service.servePicks(picked, 'immerse', [
        songKey(picked[0]),
      ]);

      expect(names(served)).not.toContain('korea-artist-0');
      expect(names(served)).toContain('korea-artist-6');
    });

    it('한국 후보가 모자라면 본 곡 대신 다른 지역의 처음 보는 곡 1곡을 빌린다', async () => {
      // 한국 6곡 중 1곡을 이미 봤다 → 팝 4번째 곡이 그 자리를 가져간다
      const picked = picks({ korea: 6, pop: 4, jpop: 1 });

      const served = await service.servePicks(picked, 'immerse', [
        songKey(picked[0]),
      ]);

      expect(served).toHaveLength(10);
      expect(names(served)).not.toContain('korea-artist-0');
      expect(names(served)).toContain('pop-artist-3');
    });

    it('화면에 낸 곡을 모드별 노출 기록에 남긴다 — 다음 요청에서는 머리 곡이다', async () => {
      const served = await service.servePicks(
        picks({ korea: 7, pop: 4, jpop: 1 }),
        'immerse',
      );

      expect(exposure.heads('immerse')).toEqual(
        new Set(served.map(({ key }) => key)),
      );
      expect(exposure.heads('soothe')).toEqual(new Set());
    });
  });
});
