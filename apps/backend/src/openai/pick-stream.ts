import type { Readable } from 'node:stream';
import type { PlaylistMode } from '../music/exposure-window';
import type { PickedTrack } from './pick-prompt';

export interface PickStreamHandlers {
  /** 루트의 값 하나가 끝났을 때 (emotion · crisis · description …). 곡 배열은 오지 않는다 */
  onField?: (key: string, value: unknown) => void;
  /** 곡 배열(immerse · soothe) 안의 곡 하나가 끝났을 때, 쓰인 순서대로 */
  onPick?: (mode: PlaylistMode, pick: PickedTrack) => void;
}

const PICK_ARRAYS = new Set(['immerse', 'soothe']);

/**
 * 스트림으로 조각조각 오는 선곡 JSON에서 완성된 값을 바로 꺼내는 스캐너.
 * 전체 JSON은 끝까지 받은 뒤 JSON.parse로 다시 검증하고, 이 스캐너는 "먼저 꺼내기"만 맡는다.
 *
 * 문자열 안/밖과 괄호 깊이만 센다 — 곡명에 들어 있는 따옴표·괄호·쉼표(이스케이프 포함)는 문자열 안이라 구조로 보지 않는다.
 * - 깊이 1(루트 객체)의 "키": 값  → 값이 끝나면(문자열은 닫는 따옴표, 그 밖은 쉼표·닫는 괄호) onField
 * - 깊이 2(immerse·soothe 배열) 안의 객체 → 닫는 괄호에서 그 부분만 JSON.parse해 onPick
 */
export class PickStreamParser {
  private buffer = '';
  private pos = 0;
  private depth = 0;
  private inString = false;
  private escaped = false;
  private stringStart = 0;
  /** 루트에서 지금 값을 읽고 있는 키 — 콜론에서 정하고, 값이 끝나면 비운다 */
  private key: string | null = null;
  /** 마지막으로 닫힌 루트 문자열 — 다음에 콜론이 오면 키다 */
  private lastString = '';
  private valueStart = -1;
  private pickStart = -1;

  constructor(private readonly handlers: PickStreamHandlers = {}) {}

  /** 지금까지 받은 전체 텍스트 — 끝까지 받은 뒤 JSON.parse로 검증한다 */
  get text(): string {
    return this.buffer;
  }

  push(chunk: string): void {
    this.buffer += chunk;
    for (; this.pos < this.buffer.length; this.pos++) {
      this.step(this.buffer[this.pos]);
    }
  }

  private step(ch: string): void {
    if (this.inString) {
      if (this.escaped) this.escaped = false;
      else if (ch === '\\') this.escaped = true;
      else if (ch === '"') {
        this.inString = false;
        this.closeString();
      }
      return;
    }
    if (ch === '"') {
      this.inString = true;
      this.stringStart = this.pos;
    } else if (ch === '{' || ch === '[') {
      const pickArray = this.key !== null && PICK_ARRAYS.has(this.key);
      if (this.depth === 2 && ch === '{' && pickArray)
        this.pickStart = this.pos;
      this.depth++;
    } else if (ch === '}' || ch === ']') {
      this.depth--;
      if (this.depth === 2 && this.pickStart >= 0) {
        this.emitPick(this.buffer.slice(this.pickStart, this.pos + 1));
        this.pickStart = -1;
      } else if (this.depth === 1 && ch === ']') {
        this.key = null; // 곡 배열이 끝났다 — 배열 자체는 onField로 보내지 않는다
      } else if (this.depth === 0) {
        this.endValue(); // 루트의 마지막 값
      }
    } else if (this.depth === 1 && ch === ':') {
      this.key = this.lastString;
      this.valueStart = this.pos + 1;
    } else if (this.depth === 1 && ch === ',') {
      this.endValue();
    }
  }

  private closeString(): void {
    if (this.depth !== 1) return;
    const value = JSON.parse(
      this.buffer.slice(this.stringStart, this.pos + 1),
    ) as string;
    if (this.key === null) {
      this.lastString = value; // 키 자리
    } else {
      this.handlers.onField?.(this.key, value); // 문자열 값
      this.key = null;
    }
  }

  /** 문자열이 아닌 루트 값(true·false·숫자·객체)이 쉼표나 닫는 괄호에서 끝났다 */
  private endValue(): void {
    if (this.key === null) return;
    const raw = this.buffer.slice(this.valueStart, this.pos).trim();
    if (raw) this.handlers.onField?.(this.key, JSON.parse(raw));
    this.key = null;
  }

  private emitPick(raw: string): void {
    this.handlers.onPick?.(this.key as PlaylistMode, JSON.parse(raw));
  }
}

/**
 * OpenAI 스트림 응답(SSE: `data: {...}` 줄, 끝은 `data: [DONE]`)에서 data 값을 하나씩 꺼낸다.
 * 네트워크 조각은 줄 중간·한글 바이트 중간에서도 끊겨 오므로, stream 디코딩으로 글자를 잇고 줄바꿈이 올 때까지 모은다.
 * [DONE] 뒤는 버리되 응답이 끝날 때까지 읽는다 — 중간에 끊으면 연결을 재사용하지 못한다
 */
export async function* readSseData(stream: Readable): AsyncGenerator<unknown> {
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  for await (const chunk of stream) {
    if (done) continue;
    buffer +=
      typeof chunk === 'string'
        ? chunk
        : decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        done = true;
        break;
      }
      yield JSON.parse(data);
    }
  }
}
