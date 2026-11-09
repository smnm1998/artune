import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import {
  buildPickFormat,
  buildPickPrompt,
  PICK_VARIANTS,
  PickOutput,
} from './pick-prompt';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockChatCompletion = (
  content: string | null,
  {
    refusal = null,
    finishReason = 'stop',
  }: { refusal?: string | null; finishReason?: string } = {},
) => ({
  data: {
    choices: [
      {
        finish_reason: finishReason,
        message: { role: 'assistant', content, refusal },
      },
    ],
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

  describe('pickSongs', () => {
    const track = (region: 'korea' | 'pop' | 'jpop', i: number) => ({
      artist: `${region} 아티스트${i}`,
      title: `${region} 곡${i}`,
      region,
    });
    const makePicks = (): PickOutput => ({
      emotion: 'joy',
      crisis: false,
      description: '오늘 하루 정말 행복한 일들이 가득했네요!',
      immerse: [track('korea', 1), track('pop', 1), track('jpop', 1)],
      soothe: [track('korea', 2), track('pop', 2), track('jpop', 2)],
    });

    it('운영 변형 V5(완화 15곡)의 프롬프트·스키마로 선곡하고 화면 라벨을 붙인다', async () => {
      const picks = makePicks();
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(JSON.stringify(picks)),
      );

      const result = await service.pickSongs('오늘 정말 행복한 하루였어요!');

      // 화면 라벨은 LLM이 아니라 enum에서 붙는다
      expect(result).toEqual({ ...picks, emotionLabel: '기쁨' });
      // 측정(D4)으로 고른 변형 — 바꾸려면 다시 측정한다
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-6-luna',
          reasoning_effort: 'none',
          response_format: buildPickFormat(PICK_VARIANTS.V5),
          messages: [
            { role: 'system', content: buildPickPrompt(PICK_VARIANTS.V5) },
            { role: 'user', content: '오늘 정말 행복한 하루였어요!' },
          ],
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it.each([
      ['빈 문자열', ''],
      ['공백만', '  '],
      ['없음(쿼리 누락)', undefined as unknown as string],
    ])(
      '텍스트가 %s이면 API를 부르지 않고 에러를 던져야 한다.',
      async (_, text) => {
        await expect(service.pickSongs(text)).rejects.toThrow(
          '분석할 텍스트를 입력해주세요.',
        );
        expect(mockedAxios.post).not.toHaveBeenCalled();
      },
    );

    it('한 모드의 곡이 3곡 미만이면 에러를 던져야 한다.', async () => {
      const picks = makePicks();
      picks.soothe = picks.soothe.slice(0, 2);
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(JSON.stringify(picks)),
      );

      await expect(service.pickSongs('테스트 텍스트')).rejects.toThrow(
        'soothe 곡이 3곡 미만입니다.',
      );
    });

    it('OpenAI API 호출 실패 시 에러를 던져야 한다.', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.pickSongs('테스트 텍스트')).rejects.toThrow(
        'API Error',
      );
    });

    it('OpenAI가 유효하지 않은 JSON을 반환하면 에러를 던져야 한다.', async () => {
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion('이것은 JSON이 아닙니다.'),
      );

      await expect(service.pickSongs('테스트 텍스트')).rejects.toThrow(
        'JSON 파싱 실패',
      );
    });

    it('모델이 응답을 거절하면 에러를 던져야 한다.', async () => {
      // strict 스키마여도 거절은 content 없이 refusal로 온다
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion(null, { refusal: 'I can’t help with that.' }),
      );

      await expect(service.pickSongs('테스트 텍스트')).rejects.toThrow(
        'OpenAI 응답 거절',
      );
    });

    it('토큰 한도에서 잘린 응답은 파싱하지 않고 에러를 던져야 한다.', async () => {
      // 잘린 JSON은 스키마를 지키지 못한다
      mockedAxios.post.mockResolvedValueOnce(
        mockChatCompletion('{"emotion": "joy", "cri', {
          finishReason: 'length',
        }),
      );

      await expect(service.pickSongs('테스트 텍스트')).rejects.toThrow(
        '토큰 한도',
      );
    });
  });
});
