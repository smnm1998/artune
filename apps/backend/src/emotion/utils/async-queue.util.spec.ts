import { AsyncQueue } from './async-queue.util';

async function drain<T>(queue: AsyncQueue<T>) {
  const out: T[] = [];
  for await (const item of queue) out.push(item);
  return out;
}

describe('AsyncQueue', () => {
  it('넣은 순서대로 꺼내고, end() 뒤에는 남은 값을 다 꺼낸 다음 끝난다', async () => {
    const queue = new AsyncQueue<number>();
    queue.push(1);
    queue.push(2);
    queue.end();
    queue.push(3); // 끝난 뒤에 넣은 값은 버린다

    await expect(drain(queue)).resolves.toEqual([1, 2]);
  });

  it('비어 있으면 다음 값이 들어올 때까지 기다린다', async () => {
    const queue = new AsyncQueue<string>();
    const result = drain(queue);

    await new Promise((r) => setImmediate(r));
    queue.push('a');
    await new Promise((r) => setImmediate(r));
    queue.push('b');
    queue.end();

    await expect(result).resolves.toEqual(['a', 'b']);
  });

  it('fail() 하면 남은 값은 버리고 그 오류를 던진다', async () => {
    const queue = new AsyncQueue<number>();
    const failure = new Error('생성 실패');
    queue.push(1);
    queue.fail(failure);

    await expect(drain(queue)).rejects.toBe(failure);
  });
});
