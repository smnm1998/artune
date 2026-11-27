/**
 * fetch 응답 본문(SSE 형식: `data: {...}` 줄 + 빈 줄)을 이벤트 단위로 꺼낸다.
 * EventSource는 GET만 돼 감정 글이 URL(접속 로그·방문 기록)에 남고, 실패해도 HTTP 상태(400·429)를 알려 주지 않고,
 * 끊기면 스스로 다시 연결해 LLM을 다시 부른다 — 그래서 POST로 보내고 본문을 직접 읽는다.
 *
 * - 네트워크 조각은 이벤트·글자 경계와 상관없이 끊겨 온다 → 빈 줄(\n\n)이 올 때까지 모았다가 꺼낸다
 * - 한글처럼 여러 바이트인 글자가 조각 사이에서 잘려도 TextDecoder의 stream 옵션이 이어 붙인다
 * - `for await (… of body)`는 Safari 지원이 늦어 reader.read() 반복으로 읽는다
 * - 다 읽거나 중간에 그만 읽으면(호출한 쪽의 return·throw) 연결을 닫는다
 */
export async function* readSseEvents<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(
        /\r\n/g,
        '\n',
      );
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (data) yield JSON.parse(data) as T;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
