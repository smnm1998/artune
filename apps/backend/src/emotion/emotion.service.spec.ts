import { Test, TestingModule } from '@nestjs/testing';
import { EmotionService } from './emotion.service';
import { OpenAIService } from '../openai/openai.service';
import { MusicService } from '../music/music.service';
import { DalleService } from '../dalle/dalle.service';
import { ITunesTrack } from '../itunes/itunes-track.type';

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
const expectMappedTrack = (track: ITunesTrack) => ({
  id: String(track.trackId),
  name: track.trackName,
  artists: [{ name: track.artistName }],
  album: {
    name: track.collectionName,
    images: [{ url: track.artworkUrl100.replace('100x100bb', '600x600bb') }],
  },
  duration_ms: track.trackTimeMillis,
  preview_url: track.previewUrl,
  external_urls: { spotify: track.trackViewUrl },
});

describe('EmotionService', () => {
  let service: EmotionService;
  let openAIService: jest.Mocked<OpenAIService>;
  let musicService: jest.Mocked<MusicService>;
  let dalleService: jest.Mocked<DalleService>;

  const mockEmotion = {
    emotion: 'joy',
    emotionLabel: '기쁨',
    intensity: 0.8,
    description: '매우 긍정적인 감정',
    immerse: {
      genres: ['pop', 'k-pop'],
      seeds: {
        korea: [
          { artist: 'IU', title: '좋은 날' },
          { artist: 'NewJeans', title: 'Super Shy' },
        ],
        pop: [{ artist: 'Dua Lipa', title: 'Levitating' }],
        jpop: [{ artist: 'YOASOBI', title: 'Idol' }],
      },
    },
    soothe: {
      genres: ['r&b', 'indie pop'],
      seeds: {
        korea: [{ artist: '박효신', title: '야생화' }],
        pop: [{ artist: 'LANY', title: 'ILYSB' }],
        jpop: [{ artist: 'Fujii Kaze', title: 'Shinunoga E-Wa' }],
      },
    },
  };

  const immerseTrack = makeTrack();
  const sootheTrack = makeTrack({
    trackId: 2,
    trackName: 'Calm Song',
    artistName: 'Artist 2',
    collectionName: 'Calm Album',
    artworkUrl100: 'https://example.com/calm/100x100bb.jpg',
    trackTimeMillis: 200000,
    previewUrl: 'https://preview2.url',
    trackViewUrl: 'https://itunes.com/track2',
  });

  const mockDessertImage = {
    imageUrl: 'https://example.com/dessert.png',
    prompt: 'A pixel_art style dessert...',
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmotionService,
        { provide: OpenAIService, useValue: { analyzeEmotion: jest.fn() } },
        { provide: MusicService, useValue: { getRecommendations: jest.fn() } },
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
    it('텍스트를 분석하여 감정, 음악, 디저트 이미지를 모두 반환해야 한다.', async () => {
      // Given
      openAIService.analyzeEmotion.mockResolvedValueOnce(mockEmotion);
      musicService.getRecommendations
        .mockResolvedValueOnce([immerseTrack])
        .mockResolvedValueOnce([sootheTrack]);
      dalleService.generateDessertImage.mockResolvedValueOnce(mockDessertImage);

      // When
      const text = '오늘 정말 기분이 좋아!';
      const result = await service.analyzeAndRecommend(text);

      // Then
      expect(result).toEqual({
        emotionLabel: '기쁨',
        description: '매우 긍정적인 감정',
        artwork: {
          url: 'https://example.com/dessert.png',
          prompt: 'A pixel_art style dessert...',
        },
        playlists: {
          immerse: {
            modeLabel: '감정 심취',
            description: expect.any(String),
            tracks: [expectMappedTrack(immerseTrack)],
          },
          soothe: {
            modeLabel: '감정 완화',
            description: expect.any(String),
            tracks: [expectMappedTrack(sootheTrack)],
          },
        },
      });

      expect(openAIService.analyzeEmotion).toHaveBeenCalledWith(text);

      // 지정 시드 + 모드 라벨로 호출 (immerse → soothe 순)
      expect(musicService.getRecommendations).toHaveBeenNthCalledWith(
        1,
        mockEmotion.immerse.seeds,
        'immerse',
      );
      expect(musicService.getRecommendations).toHaveBeenNthCalledWith(
        2,
        mockEmotion.soothe.seeds,
        'soothe',
      );
    });

    it('빈 텍스트가 입력되면 에러를 던져야 한다.', async () => {
      await expect(service.analyzeAndRecommend('')).rejects.toThrow(
        '분석할 텍스트가 필요합니다.',
      );
      expect(openAIService.analyzeEmotion).not.toHaveBeenCalled();
    });

    it('OpenAI 서비스 실패 시 에러를 전파해야 한다.', async () => {
      openAIService.analyzeEmotion.mockRejectedValueOnce(
        new Error('OpenAI API Error'),
      );

      await expect(service.analyzeAndRecommend('테스트')).rejects.toThrow();
    });

    it('Music 서비스 실패 시 에러를 전파해야 한다.', async () => {
      openAIService.analyzeEmotion.mockResolvedValueOnce(mockEmotion);
      musicService.getRecommendations.mockRejectedValueOnce(
        new Error('iTunes API Error'),
      );
      dalleService.generateDessertImage.mockResolvedValueOnce(mockDessertImage);

      await expect(service.analyzeAndRecommend('테스트')).rejects.toThrow();
    });

    it('DALL-E 서비스 실패 시 에러를 전파해야 한다.', async () => {
      openAIService.analyzeEmotion.mockResolvedValueOnce(mockEmotion);
      musicService.getRecommendations
        .mockResolvedValueOnce([immerseTrack])
        .mockResolvedValueOnce([sootheTrack]);
      dalleService.generateDessertImage.mockRejectedValueOnce(
        new Error('DALL-E API Error'),
      );

      await expect(service.analyzeAndRecommend('테스트')).rejects.toThrow();
    });
  });

  describe('analyzeAndRecommendWithProgress', () => {
    it('진행률 콜백이 0 → 100까지 단계별로 호출되어야 한다.', async () => {
      // Given
      openAIService.analyzeEmotion.mockResolvedValueOnce(mockEmotion);
      musicService.getRecommendations
        .mockResolvedValueOnce([immerseTrack])
        .mockResolvedValueOnce([sootheTrack]);
      dalleService.generateDessertImage.mockResolvedValueOnce(mockDessertImage);

      const progressCallback = jest.fn();

      // When
      const result = await service.analyzeAndRecommendWithProgress(
        '오늘 정말 기분이 좋아!',
        progressCallback,
      );

      // Then — 응답 형태는 analyzeAndRecommend와 동일해야 함
      expect(result.emotionLabel).toBe('기쁨');
      expect(result.playlists.immerse.tracks).toEqual([
        expectMappedTrack(immerseTrack),
      ]);
      expect(result.playlists.soothe.tracks).toEqual([
        expectMappedTrack(sootheTrack),
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
      expect(service.getImmerseDescription('기쁨')).toBe(
        '이 기쁨을 더 깊이 느껴보세요',
      );
    });

    it('등록되지 않은 감정은 기본 템플릿을 사용해야 한다.', () => {
      expect(service.getImmerseDescription('알수없는감정')).toBe(
        '이 알수없는감정을 더 깊이 느껴보세요',
      );
    });
  });

  describe('getSootheDescription', () => {
    it('기쁨 감정에 대한 soothe 설명을 반환해야 한다.', () => {
      expect(service.getSootheDescription('기쁨')).toBe(
        '차분히 마음을 정리해보세요',
      );
    });

    it('등록되지 않은 감정은 기본 템플릿을 사용해야 한다.', () => {
      expect(service.getSootheDescription('알수없는감정')).toBe(
        '차분히 알수없는감정을 정리해보세요',
      );
    });
  });
});
