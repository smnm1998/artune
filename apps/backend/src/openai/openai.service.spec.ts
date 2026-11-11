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
import { PassThrough, Readable } from 'node:stream';

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

  describe('pickSongsStream', () => {
    const track = (region: 'korea' | 'pop' | 'jpop', i: number) => ({
      artist: `${region} 아티스트${i}`,
      title: `${region} 곡${i}`,
      region,
    });
    const picks: PickOutput = {
      emotion: 'joy',
      crisis: false,
      description: '오늘 하루 정말 행복한 일들이 가득했네요!',
      immerse: [track('korea', 1), track('pop', 1), track('jpop', 1)],
      soothe: [track('korea', 2), track('pop', 2), track('jpop', 2)],
    };

    /** Chat Completions 스트림 응답의 SSE 프레임들 — 내용을 몇 글자씩 delta로 쪼갠다 */
    const frames = (
      content: string,
      {
        refusal,
        finishReason = 'stop',
      }: { refusal?: string; finishReason?: string } = {},
    ) => {
      const chunk = (delta: object, finish: string | null = null) =>
        `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}\n\n`;
      const out: string[] = [];
      for (let i = 0; i < content.length; i += 7) {
        out.push(chunk({ content: content.slice(i, i + 7) }));
      }
      if (refusal) out.push(chunk({ refusal }));
      out.push(chunk({}, finishReason), 'data: [DONE]\n\n');
      return out;
    };
    const streamResponse = (parts: string[]) => ({
      data: Readable.from(parts.map((part) => Buffer.from(part))),
    });

    it('AI가 쓰는 대로 루트 값과 곡을 넘기고, 끝나면 pickSongs와 같은 결과를 돌려준다', async () => {
      mockedAxios.post.mockResolvedValueOnce(
        streamResponse(frames(JSON.stringify(picks))),
      );
      const onField = jest.fn();
      const onPick = jest.fn();
      const signal = new AbortController().signal;

      const result = await service.pickSongsStream('행복했어', {
        onField,
        onPick,
        signal,
      });

      expect(result).toEqual({ ...picks, emotionLabel: '기쁨' });
      expect(onField.mock.calls).toEqual([
        ['emotion', 'joy'],
        ['crisis', false],
        ['description', picks.description],
      ]);
      expect(onPick.mock.calls).toEqual([
        ...picks.immerse.map((pick) => ['immerse', pick]),
        ...picks.soothe.map((pick) => ['soothe', pick]),
      ]);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          stream: true,
          response_format: buildPickFormat(PICK_VARIANTS.V5),
        }),
        expect.objectContaining({ responseType: 'stream', signal }),
      );
    });

    it('첫 곡은 응답이 다 오기 전에 넘긴다', async () => {
      const body = new PassThrough();
      mockedAxios.post.mockResolvedValueOnce({ data: body });
      const json = JSON.stringify(picks);
      const firstPickEnd =
        json.indexOf(JSON.stringify(picks.immerse[0])) +
        JSON.stringify(picks.immerse[0]).length;
      const onPick = jest.fn();

      const done = service.pickSongsStream('행복했어', { onPick });
      body.write(
        frames(json.slice(0, firstPickEnd + 1))
          .slice(0, -2)
          .join(''),
      );
      await new Promise((resolve) => setImmediate(resolve));

      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick).toHaveBeenCalledWith('immerse', picks.immerse[0]);

      body.end(frames(json.slice(firstPickEnd + 1)).join(''));
      await expect(done).resolves.toMatchObject({ emotion: 'joy' });
      expect(onPick).toHaveBeenCalledTimes(6);
    });

    it('텍스트가 비어 있으면 API를 부르지 않고 에러를 던진다', async () => {
      await expect(service.pickSongsStream('  ')).rejects.toThrow(
        '분석할 텍스트를 입력해주세요.',
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('모델이 거절하면 에러를 던진다', async () => {
      mockedAxios.post.mockResolvedValueOnce(
        streamResponse(frames('', { refusal: 'I can’t help with that.' })),
      );

      await expect(service.pickSongsStream('테스트')).rejects.toThrow(
        'OpenAI 응답 거절',
      );
    });

    it('토큰 한도에서 잘리면 에러를 던진다', async () => {
      mockedAxios.post.mockResolvedValueOnce(
        streamResponse(
          frames('{"emotion":"joy","cri', { finishReason: 'length' }),
        ),
      );

      await expect(service.pickSongsStream('테스트')).rejects.toThrow(
        '토큰 한도',
      );
    });

    it('한 모드가 3곡 미만이면 끝에서 에러를 던진다 — 그 전에 넘긴 곡은 있을 수 있다', async () => {
      const short = { ...picks, soothe: picks.soothe.slice(0, 2) };
      mockedAxios.post.mockResolvedValueOnce(
        streamResponse(frames(JSON.stringify(short))),
      );
      const onPick = jest.fn();

      await expect(
        service.pickSongsStream('테스트', { onPick }),
      ).rejects.toThrow('soothe 곡이 3곡 미만입니다.');
      expect(onPick).toHaveBeenCalledTimes(5);
    });

    it('API 오류 응답은 스트림 본문까지 읽어 메시지를 꺼낸다', async () => {
      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: Readable.from([
            Buffer.from('{"error":{"message":"Rate limit reached"}}'),
          ]),
        },
      });

      await expect(service.pickSongsStream('테스트')).rejects.toThrow(
        'OpenAI API 에러 (429): Rate limit reached',
      );
    });

    it('응답이 없는 오류(취소 등)는 바꾸지 않고 그대로 넘긴다', async () => {
      const canceled = new Error('canceled');
      mockedAxios.post.mockRejectedValueOnce(canceled);

      await expect(service.pickSongsStream('테스트')).rejects.toBe(canceled);
    });
  });
});
