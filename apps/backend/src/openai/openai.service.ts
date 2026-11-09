import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EMOTION_LABELS } from '../emotion/constants/emotions.constant';
import {
  buildPickFormat,
  buildPickPrompt,
  PICK_VARIANTS,
  PickOutput,
  PickResult,
  PRODUCTION_PICK_VARIANT,
} from './pick-prompt';

/**
 * 사용자 글 → 감정 분석 + 선곡 (OpenAI Chat Completions, Structured Outputs)
 */
@Injectable()
export class OpenAIService {
  // gpt-4.1-mini는 2027-01-14 종료. 추론은 끈다(none) — 프로브(11/2·11/3)가 이 설정으로 측정됨
  static readonly MODEL = 'gpt-6-luna';
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.getOrThrow('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * 사용자 글 → 감정·위기 신호·공감 문구 + 모드별 곡 (LLM 직접 선곡, R2). 변형은 PRODUCTION_PICK_VARIANT
   *
   * @throws {BadRequestException} 텍스트가 비어있을 때
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림·모드 곡이 3곡 미만일 때
   */
  async pickSongs(text: string): Promise<PickResult> {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('분석할 텍스트를 입력해주세요.');
    }
    const options = PICK_VARIANTS[PRODUCTION_PICK_VARIANT];
    const result = await this.complete<PickOutput>(
      buildPickPrompt(options),
      buildPickFormat(options),
      text,
    );
    // 곡 수는 스키마가 아니라 프롬프트로 지시한다 — 측정에서 지시 준수 98~99%(11/6)
    for (const mode of ['immerse', 'soothe'] as const) {
      if (result[mode].length < 3) {
        throw new Error(`${mode} 곡이 3곡 미만입니다.`);
      }
    }
    return { ...result, emotionLabel: EMOTION_LABELS[result.emotion] };
  }

  /**
   * Chat Completions 1회 — Structured Outputs(json_schema strict) 응답을 파싱해 돌려준다
   *
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림·JSON 파싱 실패 시
   */
  private async complete<T>(
    systemPrompt: string,
    responseFormat: object,
    text: string,
  ): Promise<T> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: OpenAIService.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          response_format: responseFormat,
          reasoning_effort: 'none',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      // strict 스키마는 형태를 보장하지만, 거절·토큰 한도 잘림은 스키마 밖 결과로 온다
      const choice = response.data.choices[0];
      if (choice.message.refusal) {
        throw new Error(`OpenAI 응답 거절: ${choice.message.refusal}`);
      }
      if (choice.finish_reason === 'length') {
        throw new Error('OpenAI 응답이 토큰 한도에서 잘렸습니다.');
      }
      return JSON.parse(choice.message.content) as T;
    } catch (error) {
      // JSON 파싱 에러
      if (error instanceof SyntaxError) {
        throw new Error('JSON 파싱 실패');
      }

      // API 호출 에러
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.error?.message || 'OpenAI API 오류';
        throw new Error(`OpenAI API 에러 (${status}): ${message}`);
      }
      // 기타 에러
      throw error;
    }
  }
}
