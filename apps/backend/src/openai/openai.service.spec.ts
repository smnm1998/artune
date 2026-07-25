import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// validateResult가 요구하는 최소 형태 (seeds: {korea, pop, jpop}, 각 { artist, title })
const makeSeeds = (label: string) => ({
  korea: [
    { artist: `${label} 한국1`, title: `${label} 곡1` },
    { artist: `${label} 한국2`, title: `${label} 곡2` },
    { artist: `${label} 한국3`, title: `${label} 곡3` },
  ],
  pop: [
    { artist: `${label} Pop1`, title: `${label} Song1` },
    { artist: `${label} Pop2`, title: `${label} Song2` },
  ],
  jpop: [{ artist: `${label} Jpop1`, title: `${label} JSong1` }],
});

const makeAnalysisResult = () => ({
  emotion: 'joy',
  emotionLabel: '기쁨',
  intensity: 0.85,
  description: '오늘 하루 정말 행복한 일들이 가득했네요!',
  immerse: {
    keywords: 'happy upbeat energetic',
    genres: ['pop', 'k-pop'],
    seeds: makeSeeds('Immerse'),
  },
  soothe: {
    keywords: 'uplifting positive chill',
    genres: ['r&b', 'indie pop'],
    seeds: makeSeeds('Soothe'),
  },
});

const mockChatCompletion = (content: string) => ({
  data: {
    choices: [{ message: { role: 'assistant', content } }],
  },
});

describe('OpenAIService', () => {
  let service: OpenAIService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => 'test-api-key'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(OpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeEmotion', () => {
    it('텍스트를 받아 감정 분석 결과를 반환해야 한다.', async () => {
      // Given
      const mockText = '오늘 정말 행복한 하루였어요!';
      const mockResult = makeAnalysisResult();
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(JSON.stringify(mockResult)),
      );

      // When
      const result = await service.analyzeEmotion(mockText);

      // Then
      expect(result).toEqual(mockResult);
      expect(result.immerse.seeds.korea).toHaveLength(3);

      // API 호출 검증
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4.1-mini',
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: mockText }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('빈 텍스트가 입력되면 에러를 던져야 한다.', async () => {
      await expect(service.analyzeEmotion('')).rejects.toThrow(
        '분석할 텍스트를 입력해주세요.',
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('null이 입력되면 에러를 던져야 한다.', async () => {
      await expect(service.analyzeEmotion(null)).rejects.toThrow();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('OpenAI API 호출 실패 시 에러를 던져야 한다.', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.analyzeEmotion('테스트 텍스트')).rejects.toThrow();
    });

    it('OpenAI가 유효하지 않은 JSON을 반환하면 에러를 던져야 한다.', async () => {
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion('이것은 JSON이 아닙니다.'),
      );

      await expect(service.analyzeEmotion('테스트 텍스트')).rejects.toThrow(
        'JSON 파싱 실패',
      );
    });

    it('필수 필드가 누락된 응답을 받으면 에러를 던져야 한다.', async () => {
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(JSON.stringify({ emotion: 'joy' })),
      );

      await expect(service.analyzeEmotion('테스트 텍스트')).rejects.toThrow(
        '필수 필드 누락',
      );
    });

    it('시드가 3곡 미만이면 에러를 던져야 한다.', async () => {
      const result = makeAnalysisResult();
      // 전체 시드를 1곡으로 축소 (하한 3 미달)
      result.immerse.seeds = {
        korea: [{ artist: 'A', title: 'B' }],
        pop: [],
        jpop: [],
      };
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(JSON.stringify(result)),
      );

      await expect(service.analyzeEmotion('테스트 텍스트')).rejects.toThrow(
        '최소 3곡 이상 필요합니다',
      );
    });

    it('시드 항목이 { artist, title } 형태가 아니면 에러를 던져야 한다.', async () => {
      const result = makeAnalysisResult();
      // 문자열 배열(잘못된 형태)로 오면 거부
      (result.immerse.seeds.korea as unknown) = ['그냥 문자열', '또 문자열'];
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(JSON.stringify(result)),
      );

      await expect(service.analyzeEmotion('테스트 텍스트')).rejects.toThrow(
        '{ artist, title } 형태여야 합니다',
      );
    });
  });
});
