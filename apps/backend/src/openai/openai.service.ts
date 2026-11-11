import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';
import { EMOTION_LABELS } from '../emotion/constants/emotions.constant';
import {
  buildPickFormat,
  buildPickPrompt,
  PickOutput,
  PickResult,
} from './pick-prompt';
import {
  PickStreamHandlers,
  PickStreamParser,
  readSseData,
} from './pick-stream';

/** 스트림 응답의 조각 하나 (Chat Completions chunk) — 쓰는 필드만 */
interface ChatChunk {
  choices?: {
    delta?: { content?: string | null; refusal?: string | null };
    finish_reason?: string | null;
  }[];
}

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
   * 사용자 글 → 감정·위기 신호·공감 문구 + 모드별 곡 (LLM 직접 선곡, R2)
   *
   * @throws {BadRequestException} 텍스트가 비어있을 때
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림·모드 곡이 3곡 미만일 때
   */
  async pickSongs(text: string): Promise<PickResult> {
    this.assertText(text);
    const result = await this.complete<PickOutput>(
      buildPickPrompt(),
      buildPickFormat(),
      text,
    );
    return this.toPickResult(result);
  }

  /**
   * pickSongs의 스트리밍 판 — 응답을 조각으로 받으며 완성된 루트 값(감정·위기 신호·공감 문구)과 곡을 바로 넘긴다.
   * 끝까지 받은 뒤에는 pickSongs와 같은 검증(거절·토큰 한도 잘림·JSON·모드별 3곡)을 거쳐 같은 모양을 돌려준다.
   * 검증은 끝에서 하므로, 실패하면 그 전에 넘긴 곡이 있을 수 있다(호출한 쪽이 error 이벤트로 알린다).
   * @param signal 취소 — 연결이 끊긴 요청의 생성을 멈춘다 (출력 토큰 비용)
   * @throws {BadRequestException} 텍스트가 비어있을 때
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림·JSON 파싱 실패·모드 곡이 3곡 미만일 때
   */
  async pickSongsStream(
    text: string,
    { signal, ...handlers }: PickStreamHandlers & { signal?: AbortSignal } = {},
  ): Promise<PickResult> {
    this.assertText(text);
    const parser = new PickStreamParser(handlers);
    let refusal = '';
    let finishReason: string | null = null;
    try {
      const response = await axios.post<Readable>(
        this.apiUrl,
        {
          ...this.requestBody(buildPickPrompt(), buildPickFormat(), text),
          stream: true,
        },
        { headers: this.headers(), responseType: 'stream', signal },
      );
      for await (const data of readSseData(response.data)) {
        const choice = (data as ChatChunk).choices?.[0];
        if (!choice) continue;
        if (choice.delta?.refusal) refusal += choice.delta.refusal;
        if (choice.delta?.content) parser.push(choice.delta.content);
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    } catch (error) {
      throw await this.toApiError(error);
    }
    if (refusal) throw new Error(`OpenAI 응답 거절: ${refusal}`);
    if (finishReason === 'length') {
      throw new Error('OpenAI 응답이 토큰 한도에서 잘렸습니다.');
    }
    let result: PickOutput;
    try {
      result = JSON.parse(parser.text) as PickOutput;
    } catch {
      throw new Error('JSON 파싱 실패');
    }
    return this.toPickResult(result);
  }

  private assertText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('분석할 텍스트를 입력해주세요.');
    }
  }

  /** 곡 수는 스키마가 아니라 프롬프트로 지시한다 — 측정에서 지시 준수 98~99%(11/6) */
  private toPickResult(result: PickOutput): PickResult {
    for (const mode of ['immerse', 'soothe'] as const) {
      if (result[mode].length < 3) {
        throw new Error(`${mode} 곡이 3곡 미만입니다.`);
      }
    }
    return { ...result, emotionLabel: EMOTION_LABELS[result.emotion] };
  }

  private requestBody(
    systemPrompt: string,
    responseFormat: object,
    text: string,
  ) {
    return {
      model: OpenAIService.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      response_format: responseFormat,
      reasoning_effort: 'none',
    };
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * API 오류 응답을 "OpenAI API 에러 (상태): 메시지"로 바꾼다. 스트림 요청이면 오류 본문도 스트림이라 다 읽은 뒤 꺼낸다.
   * 취소·네트워크 오류처럼 응답이 없는 오류는 그대로 돌려준다
   */
  private async toApiError(error: unknown): Promise<unknown> {
    if (!axios.isAxiosError(error) || !error.response) return error;
    const { status, data } = error.response;
    let body: unknown = data;
    if (data && typeof (data as Readable).pipe === 'function') {
      let raw = '';
      try {
        const decoder = new TextDecoder();
        for await (const chunk of data as Readable) {
          raw += decoder.decode(chunk, { stream: true });
        }
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
    }
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ||
      'OpenAI API 오류';
    return new Error(`OpenAI API 에러 (${status}): ${message}`);
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
        this.requestBody(systemPrompt, responseFormat, text),
        { headers: this.headers() },
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
