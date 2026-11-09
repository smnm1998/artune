import { Test, TestingModule } from '@nestjs/testing';
import { EmotionService } from './emotion.service';
import { OpenAIService } from '../openai/openai.service';
import { PickResult } from '../openai/pick-prompt';
import { MusicService, ServedTrack } from '../music/music.service';
import { DalleService } from '../dalle/dalle.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import { HISTORY_LIMIT } from '../music/utils/freshness-order.util';

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

  const immerse: ServedTrack = { track: makeTrack(), key: '1a2b3c4d' };
  const soothe: ServedTrack = {
    track: makeTrack({
      trackId: 2,
      trackName: 'Calm Song',
      artistName: 'Artist 2',
      collectionName: 'Calm Album',
      artworkUrl100: 'https://example.com/calm/100x100bb.jpg',
      trackTimeMillis: 200000,
      previewUrl: 'https://preview2.url',
      trackViewUrl: 'https://itunes.com/track2',
    }),
    key: '5e6f7a8b',
  };

  const mockDessertImage = {
    imageUrl: 'https://example.com/dessert.png',
    prompt: 'A pixel_art style dessert...',
  };

  // 선곡 → 모드별 내보내기 → 이미지가 모두 성공하는 기본 흐름
  const succeed = (picks: PickResult = mockPicks) => {
    openAIService.pickSongs.mockResolvedValueOnce(picks);
    musicService.servePicks
      .mockResolvedValueOnce([immerse])
      .mockResolvedValueOnce([soothe]);
    dalleService.generateDessertImage.mockResolvedValueOnce(mockDessertImage);
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmotionService,
        { provide: OpenAIService, useValue: { pickSongs: jest.fn() } },
        { provide: MusicService, useValue: { servePicks: jest.fn() } },
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeAndRecommend', () => {
    it('글을 분석해 감정, 곡 키가 붙은 두 모드의 곡, 디저트 이미지를 반환해야 한다.', async () => {
      succeed();

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
            tracks: [expectMappedTrack(immerse)],
          },
          soothe: {
            modeLabel: '감정 완화',
            description: expect.any(String),
            tracks: [expectMappedTrack(soothe)],
          },
        },
      });

      expect(openAIService.pickSongs).toHaveBeenCalledWith(text);
      // LLM이 고른 곡을 모드별로 내보낸다 (이력이 없으면 빈 목록)
      expect(musicService.servePicks).toHaveBeenNthCalledWith(
        1,
        mockPicks.immerse,
        'immerse',
        [],
      );
      expect(musicService.servePicks).toHaveBeenNthCalledWith(
        2,
        mockPicks.soothe,
        'soothe',
        [],
      );
      expect(dalleService.generateDessertImage).toHaveBeenCalledWith(
        'joy',
        '기쁨',
      );
    });

    it('모드별 이력(본 곡 키)을 그 모드의 내보내기에 넘긴다', async () => {
      succeed();

      await service.analyzeAndRecommend('테스트', {
        immerse: ['1a2b3c4d', '5e6f7a8b'],
        soothe: '9c0d1e2f',
      });

      expect(musicService.servePicks).toHaveBeenNthCalledWith(
        1,
        mockPicks.immerse,
        'immerse',
        ['1a2b3c4d', '5e6f7a8b'],
      );
      expect(musicService.servePicks).toHaveBeenNthCalledWith(
        2,
        mockPicks.soothe,
        'soothe',
        ['9c0d1e2f'],
      );
    });

    it('빈 텍스트가 입력되면 에러를 던져야 한다.', async () => {
      await expect(service.analyzeAndRecommend('')).rejects.toThrow(
        '분석할 텍스트가 필요합니다.',
      );
      expect(openAIService.pickSongs).not.toHaveBeenCalled();
    });

    it('상한을 넘는 텍스트는 LLM을 부르지 않고 거절한다 (프론트와 같은 500자)', async () => {
      const max = EmotionService.MAX_TEXT_LENGTH;

      await expect(
        service.analyzeAndRecommend('가'.repeat(max + 1)),
      ).rejects.toThrow(`최대 ${max}자까지 입력 가능합니다.`);
      expect(openAIService.pickSongs).not.toHaveBeenCalled();
    });

    it('앞뒤 공백을 뺀 길이가 상한 이내면 LLM까지 진행한다', async () => {
      openAIService.pickSongs.mockRejectedValueOnce(new Error('LLM 도달'));

      await expect(
        service.analyzeAndRecommend(
          `  ${'가'.repeat(EmotionService.MAX_TEXT_LENGTH)}  `,
        ),
      ).rejects.toThrow('LLM 도달');
    });

    it('쿼리로 text가 여러 번 오면(배열) 빈 입력처럼 거절한다', async () => {
      await expect(
        service.analyzeAndRecommend(['가', '나'] as unknown as string),
      ).rejects.toThrow('분석할 텍스트가 필요합니다.');
      expect(openAIService.pickSongs).not.toHaveBeenCalled();
    });

    it('OpenAI 서비스 실패 시 에러를 전파해야 한다.', async () => {
      openAIService.pickSongs.mockRejectedValueOnce(
        new Error('OpenAI API Error'),
      );

      await expect(service.analyzeAndRecommend('테스트')).rejects.toThrow();
    });

    it('Music 서비스 실패 시 에러를 전파해야 한다.', async () => {
      openAIService.pickSongs.mockResolvedValueOnce(mockPicks);
      musicService.servePicks.mockRejectedValueOnce(
        new Error('iTunes API Error'),
      );
      dalleService.generateDessertImage.mockResolvedValueOnce(mockDessertImage);

      await expect(service.analyzeAndRecommend('테스트')).rejects.toThrow();
    });

    it('DALL-E 서비스 실패 시 에러를 전파해야 한다.', async () => {
      openAIService.pickSongs.mockResolvedValueOnce(mockPicks);
      musicService.servePicks
        .mockResolvedValueOnce([immerse])
        .mockResolvedValueOnce([soothe]);
      dalleService.generateDessertImage.mockRejectedValueOnce(
        new Error('DALL-E API Error'),
      );

      await expect(service.analyzeAndRecommend('테스트')).rejects.toThrow();
    });

    it('위기 신호를 응답에 그대로 싣는다 (화면의 상담 안내 조건)', async () => {
      succeed({ ...mockPicks, crisis: true });

      const result = await service.analyzeAndRecommend('테스트');

      expect(result.crisis).toBe(true);
    });
  });

  describe('parseSeen', () => {
    it('쿼리의 쉼표로 이은 문자열과 본문의 배열을 같은 목록으로 읽는다', () => {
      expect(EmotionService.parseSeen('1a2b3c4d,5e6f7a8b')).toEqual([
        '1a2b3c4d',
        '5e6f7a8b',
      ]);
      expect(EmotionService.parseSeen(['1a2b3c4d', '5e6f7a8b'])).toEqual([
        '1a2b3c4d',
        '5e6f7a8b',
      ]);
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
      expect(EmotionService.parseSeen(undefined)).toEqual([]);
      expect(EmotionService.parseSeen({ key: '1a2b3c4d' })).toEqual([]);
    });

    it(`최근 ${HISTORY_LIMIT}곡까지만 쓴다 (뒤가 최근)`, () => {
      const keys = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) =>
        i.toString(16).padStart(8, '0'),
      );

      expect(EmotionService.parseSeen(keys)).toEqual(keys.slice(5));
    });
  });

  describe('analyzeAndRecommendWithProgress', () => {
    it('진행률 콜백이 0 → 100까지 단계별로 호출되어야 한다.', async () => {
      succeed();
      const progressCallback = jest.fn();

      const result = await service.analyzeAndRecommendWithProgress(
        '오늘 정말 기분이 좋아!',
        progressCallback,
      );

      // 응답 형태는 analyzeAndRecommend와 동일해야 함
      expect(result.emotionLabel).toBe('기쁨');
      expect(result.playlists.immerse.tracks).toEqual([
        expectMappedTrack(immerse),
      ]);
      expect(result.playlists.soothe.tracks).toEqual([
        expectMappedTrack(soothe),
      ]);

      // 주요 체크포인트가 모두 호출됨
      for (const progress of [0, 10, 30, 40, 60, 80, 95]) {
        expect(progressCallback).toHaveBeenCalledWith(
          progress,
          expect.any(String),
        );
      }
      expect(progressCallback).toHaveBeenCalledWith(100, '완료!');

      // 진행률은 단조 증가해야 함 (순차 처리 보장의 핵심 계약)
      const progressValues = progressCallback.mock.calls.map(
        (call) => call[0] as number,
      );
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });

    it('빈 텍스트가 입력되면 에러를 던져야 한다.', async () => {
      const progressCallback = jest.fn();

      await expect(
        service.analyzeAndRecommendWithProgress('', progressCallback),
      ).rejects.toThrow('분석할 텍스트가 필요합니다.');
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
});
