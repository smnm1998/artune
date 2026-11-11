import { describe, it, expect, vi } from 'vitest';
import { readSseEvents } from '@/api/sse';

const encoder = new TextEncoder();

/** 조각을 그대로 흘려보내는 본문 — 네트워크 조각 경계를 흉내 낸다 */
function bodyOf(chunks: (string | Uint8Array)[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk,
        );
      }
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>) {
  const events: unknown[] = [];
  for await (const event of readSseEvents(body)) events.push(event);
  return events;
}

describe('readSseEvents', () => {
  it('조각이 이벤트 중간에서 끊겨도 빈 줄이 올 때까지 모아 꺼낸다', async () => {
    const events = await collect(
      bodyOf(['data: {"n":', '1}\n', '\ndata: {"n":2}\n\n']),
    );

    expect(events).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it('여러 바이트인 한글이 조각 사이에서 잘려도 깨지지 않는다', async () => {
    const bytes = encoder.encode('data: {"label":"기쁨"}\n\n');
    const cut = bytes.indexOf(0xea) + 1; // '기'(EA B8 B0)의 첫 바이트 뒤에서 자른다

    const events = await collect(
      bodyOf([bytes.slice(0, cut), bytes.slice(cut)]),
    );

    expect(events).toEqual([{ label: '기쁨' }]);
  });

  it('CRLF 줄바꿈과 여러 줄로 나뉜 data를 이어 읽는다', async () => {
    const events = await collect(bodyOf(['data: {"n":\r\ndata: 3}\r\n\r\n']));

    expect(events).toEqual([{ n: 3 }]);
  });

  it('data가 없는 프레임(주석·keep-alive)은 건너뛴다', async () => {
    const events = await collect(bodyOf([': ping\n\n', 'data: {"n":4}\n\n']));

    expect(events).toEqual([{ n: 4 }]);
  });

  it('중간에 그만 읽으면 연결을 닫는다', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"n":1}\n\ndata: {"n":2}\n\n'),
        );
      },
      cancel,
    });

    for await (const event of readSseEvents(body)) {
      expect(event).toEqual({ n: 1 });
      break;
    }

    expect(cancel).toHaveBeenCalled();
  });
});
