/**
 * push로 넣고 for await로 꺼내는 큐 — 생산자(AI 선곡 스트림)와 소비자(모드별 해석)를 잇는다. 소비자는 하나.
 * - end(): 남은 값을 다 꺼낸 뒤 끝난다
 * - fail(error): 남은 값은 버리고 바로 그 오류를 던진다 (생성이 실패하면 해석도 멈춘다)
 */
export class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = [];
  private closed = false;
  private failure: { error: unknown } | null = null;
  private wake: (() => void) | null = null;

  push(item: T): void {
    if (this.closed) return;
    this.items.push(item);
    this.notify();
  }

  end(): void {
    this.closed = true;
    this.notify();
  }

  fail(error: unknown): void {
    if (this.closed) return;
    this.closed = true;
    this.failure = { error };
    this.notify();
  }

  private notify(): void {
    this.wake?.();
    this.wake = null;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    while (true) {
      if (this.failure) throw this.failure.error;
      if (this.items.length > 0) {
        yield this.items.shift()!;
        continue;
      }
      if (this.closed) return;
      await new Promise<void>((resolve) => (this.wake = resolve));
    }
  }
}
