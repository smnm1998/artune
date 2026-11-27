import { Logger } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** 배포 프론트 — 도메인을 새로 붙이면 여기에 더한다 */
const DEPLOYED_ORIGINS = ['https://om-artune.vercel.app'];

/**
 * 개발 주소 — localhost·127.0.0.1과 사설 IP(같은 와이파이의 휴대폰 테스트), 포트 무관.
 * 그 기기·내부망에서만 열리는 주소라 배포에서도 막지 않는다 → NODE_ENV에 기대지 않는다
 */
const LOCAL_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;

/**
 * 이 주소의 페이지가 API를 불러도 되는지 — 등록된 주소와 로컬·사설 IP만, 나머지는 환경과 상관없이 거부.
 * Origin이 없는 요청(curl·측정 하네스·서버 간 호출)은 통과한다 — CORS는 브라우저만 지키고, 남용은 요청 제한이 막는다
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return DEPLOYED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
}

const logger = new Logger('CORS');

/** 프론트는 POST 두 경로에 JSON 본문 + 스트림 Accept만 보낸다 (쿠키·인증 헤더 없음) */
export const CORS_OPTIONS: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = isAllowedOrigin(origin);
    if (!allowed) logger.warn(`등록 안 된 주소 거부: ${origin}`);
    callback(null, allowed);
  },
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
};
