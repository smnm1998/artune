import { Test, TestingModule } from '@nestjs/testing';
import { EmotionService } from './emotion.service';
import { OpenAIService } from '../openai/openai.service';
import { PickedTrack, PickResult } from '../openai/pick-prompt';
import { MusicService, ServedTrack } from '../music/music.service';
import { DalleService } from '../dalle/dalle.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import { HISTORY_LIMIT } from '../music/utils/freshness-order.util';
import type { PlaylistMode } from '../music/exposure-window';

const makeTrack = (overrides: Partial<ITunesTrack> = {}): ITunesTrack => ({
  trackId: 1,
  trackName: 'Happy Song',
  artistName: 'Artist 1',
  collectionName: 'Happy Album',
  artworkUrl100: 'https://example.com/100x100bb.jpg',
  trackTimeMillis: 180000,
  previewUrl: 'https://preview1.url',
  trackViewUrl: 'https://itunes.com/track1',
  ...overrides,
});

/** 해석 흉내가 모드의 index번째 곡으로 내보내는 것 */
const servedOf = (
  mode: PlaylistMode,
  pick: PickedTrack,
  index: number,
): ServedTrack => ({
  track: makeTrack({
    trackId: (mode === 'immerse' ? 100 : 200) + index,
    trackName: pick.title,
    artistName: pick.artist,
  }),
  key: `${mode === 'immerse' ? 'a' : 'b'}000000${index}`,
});

// mapItunesTrackToFrontend 통과 후 기대 형태
const expectMappedTrack = ({ track, key }: ServedTrack) => ({
  id: String(track.trackId),
  name: track.trackName,
  artists: [{ name: track.artistName }],
  album: {
    name: track.collectionName,
    images: [{ url: track.artworkUrl100.replace('100x100bb', '600x600bb') }],
  },
  duration_ms: track.trackTimeMillis,
  preview_url: track.previewUrl,
  appleMusicUrl: track.trackViewUrl,
  key,
});

describe('EmotionService', () => {
  type Event = { type: string; [key: string]: unknown };

  let service: EmotionService;
  let openAIService: jest.Mocked<OpenAIService>;
  let musicService: jest.Mocked<MusicService>;
  let dalleService: jest.Mocked<DalleService>;

  const mockPicks: PickResult = {
    emotion: 'joy',
    emotionLabel: '기쁨',
    crisis: false,
    description: '매우 긍정적인 감정',
    immerse: [
      { artist: 'IU', title: '좋은 날', region: 'korea' },
      { artist: 'Dua Lipa', title: 'Levitating', region: 'pop' },
      { artist: 'YOASOBI', title: 'Idol', region: 'jpop' },
    ],
    soothe: [
      { artist: '박효신', title: '야생화', region: 'korea' },
      { artist: 'LANY', title: 'ILYSB', region: 'pop' },
      { artist: 'Fujii Kaze', title: 'Shinunoga E-Wa', region: 'jpop' },
    ],
  };

  const mockDessertImage = {
    imageUrl: 'https://example.com/dessert.png',
    prompt: 'A pixel_art style dessert...',
  };

  /** AI가 루트 값 → 심취 곡 → 완화 곡 순서로 쓰는 흉내 */
  const writePicks = (picks: PickResult = mockPicks) =>
    openAIService.pickSongsStream.mockImplementation(
      async (_text, { onField, onPick } = {}) => {
        onField?.('emotion', picks.emotion);
        onField?.('crisis', picks.crisis);
        onField?.('description', picks.description);
        for (const pick of picks.immerse) onPick?.('immerse', pick);
        for (const pick of picks.soothe) onPick?.('soothe', pick);
        return picks;
      },
    );
  /** 받은 곡을 그대로 고르는 흉내 — 받은 순서·모드를 기록한다 */
  const consumed: Record<string, string[]> = {};
  const serveAll = () =>
    musicService.servePicksStream.mockImplementation(
      async (picks, mode, _seen, { onTrack } = {}) => {
        consumed[mode] = [];
        const out: ServedTrack[] = [];
        for await (const pick of picks) {
          consumed[mode].push(pick.title);
          const served = servedOf(mode, pick, out.length);
          out.push(served);
          onTrack?.(served, out.length - 1);
        }
        return out;
      },
    );
  const record = () => {
    const events: Event[] = [];
    return {
      events,
      handlers: {
        onProgress: (progress: number, message: string) =>
          events.push({ type: 'progress', progress, message }),
        onMeta: (data: unknown) => events.push({ type: 'meta', data }),
        onTrack: (mode: PlaylistMode, index: number, track: unknown) =>
          events.push({ type: 'track', mode, index, track }),
      },
    };
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmotionService,
        { provide: OpenAIService, useValue: { pickSongsStream: jest.fn() } },
        { provide: MusicService, useValue: { servePicksStream: jest.fn() } },
        {
          provide: DalleService,
          useValue: { generateDessertImage: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(EmotionService);
    openAIService = moduleRef.get(OpenAIService);
    musicService = moduleRef.get(MusicService);
    dalleService = moduleRef.get(DalleService);

    writePicks();
    serveAll();
    dalleService.generateDessertImage.mockResolvedValue(mockDessertImage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeAndRecommend', () => {
    it('스트리밍 파이프라인을 이벤트 없이 돌려 감정, 곡 키가 붙은 두 모드의 곡, 아트워크를 돌려준다', async () => {
      const text = '오늘 정말 기분이 좋아!';
      const result = await service.analyzeAndRecommend(text);

      expect(result).toEqual({
        emotionLabel: '기쁨',
        description: '매우 긍정적인 감정',
        crisis: false,
        artwork: {
          url: 'https://example.com/dessert.png',
          prompt: 'A pixel_art style dessert...',
        },
        playlists: {
          immerse: {
            modeLabel: '감정 심취',
            description: expect.any(String),
            tracks: mockPicks.immerse.map((pick, i) =>
              expectMappedTrack(servedOf('immerse', pick, i)),
            ),
          },
          soothe: {
            modeLabel: '감정 완화',
            description: expect.any(String),
            tracks: mockPicks.soothe.map((pick, i) =>
              expectMappedTrack(servedOf('soothe', pick, i)),
            ),
          },
        },
      });
      expect(openAIService.pickSongsStream).toHaveBeenCalledWith(
        text,
        expect.anything(),
      );
      expect(dalleService.generateDessertImage).toHaveBeenCalledWith(
        'joy',
        '기쁨',
      );
    });

    it('모드별 이력(본 곡 키)을 그 모드의 해석에 넘긴다', async () => {
      await service.analyzeAndRecommend('테스트', {
        immerse: ['1a2b3c4d', '5e6f7a8b'],
        soothe: ['9c0d1e2f'],
      });

      expect(musicService.servePicksStream).toHaveBeenCalledWith(
        expect.anything(),
        'immerse',
        ['1a2b3c4d', '5e6f7a8b'],
        expect.anything(),
      );
      expect(musicService.servePicksStream).toHaveBeenCalledWith(
        expect.anything(),
        'soothe',
        ['9c0d1e2f'],
        expect.anything(),
      );
    });

    it('위기 신호를 응답에 그대로 싣는다 (화면의 상담 안내 조건)', async () => {
      writePicks({ ...mockPicks, crisis: true });

      const result = await service.analyzeAndRecommend('테스트');

      expect(result.crisis).toBe(true);
    });
  });

  describe('parseSeen', () => {
    it('본문의 배열을 곡 키 목록으로 읽는다', () => {
      expect(EmotionService.parseSeen(['1a2b3c4d', '5e6f7a8b'])).toEqual([
        '1a2b3c4d',
        '5e6f7a8b',
      ]);
    });

    it('배열이 아니면(옛 GET 쿼리의 쉼표 문자열 포함) 빈 목록이다', () => {
      expect(EmotionService.parseSeen('1a2b3c4d,5e6f7a8b')).toEqual([]);
      expect(EmotionService.parseSeen(undefined)).toEqual([]);
      expect(EmotionService.parseSeen({ key: '1a2b3c4d' })).toEqual([]);
    });

    it('곡 키 형식(16진수 8자)이 아닌 값은 오류 없이 버린다', () => {
      expect(
        EmotionService.parseSeen([
          '1a2b3c4d',
          '1A2B3C4D', // 대문자
          '1a2b3c4', // 7자
          '1a2b3c4d5', // 9자
          'zzzzzzzz',
          42,
          null,
        ]),
      ).toEqual(['1a2b3c4d']);
    });

    it(`최근 ${HISTORY_LIMIT}곡까지만 쓴다 (뒤가 최근)`, () => {
      const keys = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) =>
        i.toString(16).padStart(8, '0'),
      );

      expect(EmotionService.parseSeen(keys)).toEqual(keys.slice(5));
    });
  });

  describe('getImmerseDescription', () => {
    it('기쁨 감정에 대한 immerse 설명을 반환해야 한다.', () => {
      expect(service.getImmerseDescription('joy')).toBe(
        '이 기쁨을 더 깊이 느껴보세요',
      );
    });

    it('두려움·중립·놀람도 전용 설명을 반환해야 한다.', () => {
      // 설명 키(불안·평온)와 LLM 라벨(두려움·중립)이 어긋나 기본 문구가 나가던 감정 (11/4)
      expect(service.getImmerseDescription('fear')).toBe(
        '지금 느끼는 불안을 인정해보세요',
      );
      expect(service.getImmerseDescription('neutral')).toBe(
        '이 평온함을 더 깊이 만끽해보세요',
      );
      expect(service.getImmerseDescription('surprise')).toBe(
        '이 짜릿한 순간을 생생하게 느껴보세요',
      );
    });
  });

  describe('getSootheDescription', () => {
    it('기쁨 감정에 대한 soothe 설명을 반환해야 한다.', () => {
      expect(service.getSootheDescription('joy')).toBe(
        '차분히 마음을 정리해보세요',
      );
    });
  });

  describe('analyzeStream', () => {
    it('meta를 곡보다 먼저 한 번 보내고, 곡을 모드별 순서대로 보내며, 최종 응답은 보낸 곡을 다 모은 것과 같다', async () => {
      const { events, handlers } = record();

      const result = await service.analyzeStream('행복했어', {}, handlers);

      const metas = events.filter((e) => e.type === 'meta');
      const tracks = events.filter((e) => e.type === 'track');
      expect(metas).toHaveLength(1);
      expect(metas[0].data).toEqual({
        ...result,
        playlists: {
          immerse: { ...result.playlists.immerse, tracks: [] },
          soothe: { ...result.playlists.soothe, tracks: [] },
        },
      });
      expect(events.indexOf(metas[0])).toBeLessThan(events.indexOf(tracks[0]));
      for (const mode of ['immerse', 'soothe'] as const) {
        const sent = tracks.filter((e) => e.mode === mode);
        expect(sent.map((e) => e.index)).toEqual([0, 1, 2]);
        expect(sent.map((e) => e.track)).toEqual(result.playlists[mode].tracks);
      }
      const progress = events
        .filter((e) => e.type === 'progress')
        .map((e) => e.progress as number);
      expect(progress.slice(0, 2)).toEqual([0, 10]);
      expect(progress.at(-1)).toBe(100);
      expect(progress).toEqual([...progress].sort((a, b) => a - b));
      expect(result.emotionLabel).toBe('기쁨');
      expect(result.artwork.url).toBe(mockDessertImage.imageUrl);
    });

    it('곡을 AI가 쓴 모드로 쓴 순서대로 넘기고, 모드별 이력과 취소 신호를 넘긴다', async () => {
      const signal = new AbortController().signal;
      const seen = { immerse: ['0000000a'], soothe: ['0000000b', 'zzz'] };

      await service.analyzeStream('행복했어', seen, { signal });

      expect(consumed.immerse).toEqual(mockPicks.immerse.map((p) => p.title));
      expect(consumed.soothe).toEqual(mockPicks.soothe.map((p) => p.title));
      expect(musicService.servePicksStream).toHaveBeenCalledWith(
        expect.anything(),
        'immerse',
        ['0000000a'],
        expect.objectContaining({ signal }),
      );
      expect(musicService.servePicksStream).toHaveBeenCalledWith(
        expect.anything(),
        'soothe',
        ['0000000b'],
        expect.objectContaining({ signal }),
      );
      expect(openAIService.pickSongsStream).toHaveBeenCalledWith(
        '행복했어',
        expect.objectContaining({ signal }),
      );
    });

    it('빈 글은 아무것도 보내기 전에 거절한다', async () => {
      const { events, handlers } = record();

      await expect(service.analyzeStream('  ', {}, handlers)).rejects.toThrow(
        '분석할 텍스트가 필요합니다.',
      );
      expect(events).toEqual([]);
      expect(openAIService.pickSongsStream).not.toHaveBeenCalled();
    });

    it('상한을 넘는 글은 LLM을 부르지 않고 거절한다 (프론트와 같은 500자)', async () => {
      const max = EmotionService.MAX_TEXT_LENGTH;

      await expect(service.analyzeStream('가'.repeat(max + 1))).rejects.toThrow(
        `최대 ${max}자까지 입력 가능합니다.`,
      );
      expect(openAIService.pickSongsStream).not.toHaveBeenCalled();
    });

    it('앞뒤 공백을 뺀 길이가 상한 이내면 LLM까지 진행한다', async () => {
      openAIService.pickSongsStream.mockRejectedValueOnce(
        new Error('LLM 도달'),
      );

      await expect(
        service.analyzeStream(
          `  ${'가'.repeat(EmotionService.MAX_TEXT_LENGTH)}  `,
        ),
      ).rejects.toThrow('LLM 도달');
    });

    it('본문의 text가 문자열이 아니면(배열 등) 빈 글처럼 거절한다', async () => {
      await expect(service.analyzeStream(['가', '나'])).rejects.toThrow(
        '분석할 텍스트가 필요합니다.',
      );
      expect(openAIService.pickSongsStream).not.toHaveBeenCalled();
    });

    it('선곡 스트림이 실패하면 모드별 해석에도 그 오류를 넘기고 그대로 던진다', async () => {
      const failure = new Error('OpenAI API 에러 (500)');
      openAIService.pickSongsStream.mockImplementation(
        async (_text, { onPick } = {}) => {
          onPick?.('immerse', mockPicks.immerse[0]);
          throw failure;
        },
      );
      const seenErrors: unknown[] = [];
      musicService.servePicksStream.mockImplementation(async (picks) => {
        try {
          for await (const _ of picks) {
            // 곡을 받다가 생성 실패를 만난다
          }
        } catch (error) {
          seenErrors.push(error);
          throw error;
        }
        return [];
      });

      await expect(service.analyzeStream('행복했어')).rejects.toBe(failure);
      await new Promise((r) => setImmediate(r));
      expect(seenErrors).toEqual([failure, failure]);
    });

    it('곡 해석이 실패하면 그 오류를 던진다', async () => {
      const failure = new Error('iTunes API Error');
      musicService.servePicksStream.mockRejectedValue(failure);

      await expect(service.analyzeStream('행복했어')).rejects.toBe(failure);
    });

    it('아트워크 매핑이 늦게 끝나도 meta가 곡보다 먼저 나간다', async () => {
      dalleService.generateDessertImage.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockDessertImage), 20),
          ),
      );
      const { events, handlers } = record();

      await service.analyzeStream('행복했어', {}, handlers);

      const kinds = events
        .filter((e) => e.type !== 'progress')
        .map((e) => e.type);
      expect(kinds[0]).toBe('meta');
      expect(kinds.filter((k) => k === 'track')).toHaveLength(6);
    });
  });
});
