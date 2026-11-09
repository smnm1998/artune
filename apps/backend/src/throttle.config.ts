import {
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
  normalizeIp,
} from '@nestjs/throttler';

/**
 * 요청 제한을 셀 클라이언트 IP — Railway 엣지가 X-Real-IP에 실제 클라이언트 IP를 넣는다(공식 문서에 적힌 헤더).
 * trust proxy + X-Forwarded-For로 얻은 req.ip는 요청마다 다른 Railway 쪽 주소여서 IP별로 세지 못했다 (11/9 운영 실측).
 * 프록시가 없는 로컬·테스트에선 이 헤더가 없으니 접속 주소(req.ip)로 센다. IPv6는 기본값대로 /64 단위로 묶는다
 */
export const getClientIp: ThrottlerGetTrackerFunction = (req) => {
  const realIp = req.headers?.['x-real-ip'];
  return normalizeIp(typeof realIp === 'string' && realIp ? realIp : req.ip);
};

/**
 * IP당 요청 제한 — 요청 한 번마다 LLM 호출(비용)과 iTunes 해석이 붙는다.
 * 사람이 쓰기엔 분당 몇 번이면 충분하고, 스크립트의 반복 호출만 막는다.
 * app.module과 테스트가 같은 값을 쓰도록 따로 둔다 (app.module을 import하면 ConfigModule이 .env를 불러온다)
 */
export const THROTTLE_OPTIONS = {
  throttlers: [{ ttl: 60_000, limit: 5 }],
  getTracker: getClientIp,
  errorMessage: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
} satisfies ThrottlerModuleOptions;
