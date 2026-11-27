import { isAllowedOrigin } from './cors.config';

describe('isAllowedOrigin', () => {
  it.each([
    'https://om-artune.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://192.168.0.12:5173',
    'http://10.0.0.5:5173',
    'http://172.20.1.3:5173',
  ])('배포 주소와 로컬·사설 IP는 허용한다: %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true);
  });

  it.each([
    'https://evil.example.com',
    'https://om-artune.vercel.app.evil.com',
    'http://localhost.evil.com',
    'http://192.168.0.12.evil.com',
    'http://172.32.0.1:5173',
  ])('그 밖의 주소는 거부한다 — 이름 앞부분만 같은 주소도: %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false);
  });

  it('Origin이 없는 요청(curl·서버 간 호출)은 통과한다 — CORS는 브라우저만 지킨다', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
  });
});
