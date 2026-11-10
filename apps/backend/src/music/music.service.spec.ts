import { Test, TestingModule } from '@nestjs/testing';
import { MusicService } from './music.service';
import { ITunesService } from '../itunes/itunes.service';
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

describe('MusicService', () => {
  let service: MusicService;
  let itunesService: jest.Mocked<ITunesService>;
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
        { provide: ExposureWindow, useValue: exposure },
      ],
    }).compile();

    service = moduleRef.get(MusicService);
    itunesService = moduleRef.get(ITunesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    it('해석에 실패한 곡은 빼고 다른 후보로 채운다 — 일본 곡이 안 찾아져도 10곡', async () => {
      let id = 0;
      itunesService.resolveTrack.mockImplementation(({ artist }) =>
        Promise.resolve(
          artist.startsWith('jpop') ? null : makeTrack(++id, artist),
        ),
      );

      const served = await service.servePicks(
        picks({ korea: 7, pop: 4, jpop: 1 }),
        'immerse',
      );

      expect(served).toHaveLength(10);
      expect(names(served).some((n) => n.startsWith('jpop'))).toBe(false);
    });

    it('LLM이 같은 가수의 곡을 두 번 골라도 화면에는 1곡만 낸다', async () => {
      const picked = picks({ korea: 7, pop: 4, jpop: 1 });
      picked[1] = { ...picked[1], artist: picked[0].artist };

      const served = await service.servePicks(picked, 'immerse');

      expect(served).toHaveLength(10);
      expect(names(served).filter((n) => n === 'korea-artist-0')).toHaveLength(
        1,
      );
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

  describe('servePicksStream', () => {
    const picks = (counts: Partial<Record<Region, number>>): PickedTrack[] =>
      (Object.entries(counts) as [Region, number][]).flatMap(([region, n]) =>
        Array.from({ length: n }, (_, i) => ({
          artist: `${region}-artist-${i}`,
          title: `${region} song ${i}`,
          region,
        })),
      );
    const ticks = async (n: number) => {
      for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
    };
    /** AI가 곡을 하나씩 쓰는 것처럼 흘려보낸다 */
    async function* written(items: PickedTrack[]) {
      for (const item of items) {
        await ticks(1);
        yield item;
      }
    }
    /** 순서와 상관없이 같은 가수에 같은 트랙 — 스트리밍은 해석 순서가 servePicks와 다를 수 있다 */
    const ids = new Map<string, number>();
    beforeEach(() => {
      itunesService.resolveTrack.mockImplementation(({ artist }) => {
        if (!ids.has(artist)) ids.set(artist, ids.size + 1);
        return Promise.resolve(makeTrack(ids.get(artist)!, artist));
      });
    });

    it('곡이 다 모인 뒤 servePicks와 같은 목록·순서이고, 고른 곡을 그 순서대로 하나씩 내보낸다 (머리 곡·본 곡 포함)', async () => {
      // 두 서비스가 같은 노출 기록에서 시작하게 첫 요청을 각각 한 번씩 → 'korea song 0'이 머리 곡
      const batchService = new MusicService(
        itunesService,
        new ExposureWindow({ warmup: 1 }),
      );
      const first = picks({ korea: 7, pop: 4, jpop: 1 });
      await service.servePicks(first, 'immerse');
      await batchService.servePicks(first, 'immerse');
      const pick = (title: string, region: Region = 'korea'): PickedTrack => ({
        artist: `${title}-artist`,
        title,
        region,
      });
      const second = [
        pick('본 곡 1'),
        first[0],
        pick('새 곡 1'),
        pick('본 곡 2'),
        pick('새 곡 2'),
        pick('new pop 1', 'pop'),
        pick('새 곡 3'),
        pick('new pop 2', 'pop'),
        pick('새 곡 4'),
        pick('新しい歌', 'jpop'),
        pick('new pop 3', 'pop'),
      ];
      const seen = [songKey(second[0]), songKey(second[3])];
      const expected = await batchService.servePicks(second, 'immerse', seen);
      const onTrack = jest.fn();

      const served = await service.servePicksStream(
        written(second),
        'immerse',
        seen,
        { onTrack },
      );

      expect(served).toEqual(expected);
      expect(onTrack.mock.calls).toEqual(served.map((item, i) => [item, i]));
    });

    it('KR 표기를 마친 곡만 내보내고, 조회가 도는 동안 고른 곡은 모아서 한 번에 조회한다', async () => {
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      const batches: number[] = [];
      itunesService.localizeTracks.mockImplementation(async (tracks) => {
        batches.push(tracks.length);
        if (batches.length === 1) await gate;
        return tracks.map((t) => ({ ...t, trackName: `KR ${t.trackName}` }));
      });
      const onTrack = jest.fn();

      const done = service.servePicksStream(
        written(picks({ korea: 6, pop: 3, jpop: 1 })),
        'soothe',
        [],
        { onTrack },
      );
      await ticks(40); // 첫 곡의 조회가 막혀 있는 동안 나머지 9곡이 골라진다
      expect(onTrack).not.toHaveBeenCalled();
      release();
      const served = await done;

      expect(batches).toEqual([1, 9]);
      expect(
        served.every(({ track }) => track.trackName.startsWith('KR ')),
      ).toBe(true);
      expect(onTrack.mock.calls.map(([item]) => item)).toEqual(served);
    });

    it('고르는 동안에는 KR 조회 사이에 간격을 두고 그동안 고른 곡을 모은다 — 곡마다 조회하지 않는다', async () => {
      service['krLookupGapMs'] = 40;
      const starts: number[] = [];
      const sizes: number[] = [];
      itunesService.localizeTracks.mockImplementation(async (tracks) => {
        starts.push(Date.now());
        sizes.push(tracks.length);
        return tracks;
      });
      async function* paced(items: PickedTrack[]) {
        for (const item of items) {
          await new Promise((r) => setTimeout(r, 8));
          yield item;
        }
      }

      const served = await service.servePicksStream(
        paced(picks({ korea: 6, pop: 3, jpop: 1 })),
        'immerse',
      );

      expect(served).toHaveLength(10);
      expect(sizes[0]).toBe(1); // 첫 곡은 기다리지 않는다
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(10);
      expect(sizes.length).toBeLessThan(5);
      expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(35);
    });

    it('첫 곡은 AI가 곡을 다 쓰기 전에 내보낸다', async () => {
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      const items = picks({ korea: 6, pop: 3, jpop: 1 });
      async function* slow() {
        yield items[0];
        await gate;
        yield* items.slice(1);
      }
      const onTrack = jest.fn();

      const done = service.servePicksStream(slow(), 'immerse', [], { onTrack });
      await ticks(5);

      expect(onTrack).toHaveBeenCalledTimes(1);
      release();
      await expect(done).resolves.toHaveLength(10);
    });

    it('AI 스트림이 실패하면 남은 해석을 멈추고 그 오류를 던진다 — 노출 기록에도 남기지 않는다', async () => {
      const failure = new Error('OpenAI API 에러 (500)');
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      itunesService.resolveTrack.mockImplementation(async ({ artist }) => {
        await gate;
        return makeTrack(artist.length, artist);
      });
      const items = picks({ korea: 6 });
      async function* broken() {
        yield* items;
        await ticks(2);
        throw failure;
      }

      await expect(service.servePicksStream(broken(), 'immerse')).rejects.toBe(
        failure,
      );
      const callsAtFailure = itunesService.resolveTrack.mock.calls.length;
      release(); // 실패 전에 시작한 해석이 끝나도 다음 곡 해석을 새로 시작하지 않는다
      await ticks(10);

      expect(callsAtFailure).toBe(3);
      expect(itunesService.resolveTrack.mock.calls.length).toBe(callsAtFailure);
      expect(exposure.heads('immerse')).toEqual(new Set());
    });
  });
});
