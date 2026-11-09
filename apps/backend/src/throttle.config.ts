import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * IP당 요청 제한 — 요청 한 번마다 LLM 호출(비용)과 iTunes 해석이 붙는다.
 * 사람이 쓰기엔 분당 몇 번이면 충분하고, 스크립트의 반복 호출만 막는다.
 * app.module과 테스트가 같은 값을 쓰도록 따로 둔다 (app.module을 import하면 ConfigModule이 .env를 불러온다)
 */
export const THROTTLE_OPTIONS = {
  throttlers: [{ ttl: 60_000, limit: 5 }],
  errorMessage: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
} satisfies ThrottlerModuleOptions;

/**
 * Railway 프록시 한 단계만 신뢰해 req.ip가 프록시가 아니라 실제 클라이언트 IP가 되게 한다.
 * 더 많이 신뢰하면 클라이언트가 X-Forwarded-For를 꾸며 제한을 피할 수 있다 — 배포 후 실제 IP가 잡히는지 확인
 */
export const TRUSTED_PROXY_HOPS = 1;
