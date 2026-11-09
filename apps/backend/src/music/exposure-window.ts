export type PlaylistMode = 'immerse' | 'soothe';

export interface ExposureWindowOptions {
  /** 모드별로 기억하는 최근 화면 목록 수 */
  size: number;
  /** 기억하는 목록 중 이 비율 이상에 나온 곡을 머리 곡으로 본다 */
  threshold: number;
  /** 목록이 이만큼 쌓이기 전에는 머리 곡을 정하지 않는다 (재시작·배포 직후) */
  warmup: number;
}

/** 👤 11/5 결정: 모드별 최근 30목록 중 15% 이상, 응답 5개부터 */
export const EXPOSURE_DEFAULTS: ExposureWindowOptions = {
  size: 30,
  threshold: 0.15,
  warmup: 5,
};

/**
 * 전체 노출 기록 — 감정과 무관하게 여러 화면에 반복되는 곡(머리 곡, 예: 완화의 'Sunrise')을 찾는다.
 * - 기록하는 것은 사용자가 보는 화면 10곡의 곡 키(songKey). 서버가 해석하면 실제 목록,
 *   브라우저가 해석하면(R3) 서버가 예측한 목록을 넣는다
 * - 프로세스 메모리에만 둔다(DB 보류). 재시작하면 비고, 목록이 다시 쌓일 때까지 머리 곡이 없다
 * - 목록이 5~6개일 때는 한 번 나온 곡도 15%를 넘는다(1/6 ≈ 17%). 트래픽이 적으면 최근에 누구에게든 보인 곡이 머리 곡이 된다
 * - 테스트·측정 재생은 기준을 바꾸거나 기록을 직접 넣어 쓴다
 */
export class ExposureWindow {
  private readonly options: ExposureWindowOptions;
  private readonly lists: Record<PlaylistMode, Set<string>[]> = {
    immerse: [],
    soothe: [],
  };

  constructor(options: Partial<ExposureWindowOptions> = {}) {
    this.options = { ...EXPOSURE_DEFAULTS, ...options };
  }

  record(mode: PlaylistMode, keys: readonly string[]): void {
    const lists = this.lists[mode];
    lists.push(new Set(keys));
    if (lists.length > this.options.size) lists.shift();
  }

  heads(mode: PlaylistMode): Set<string> {
    const lists = this.lists[mode];
    if (lists.length < this.options.warmup) return new Set();
    const counts = new Map<string, number>();
    for (const list of lists)
      for (const key of list) counts.set(key, (counts.get(key) ?? 0) + 1);
    return new Set(
      [...counts]
        .filter(([, n]) => n / lists.length >= this.options.threshold)
        .map(([key]) => key),
    );
  }
}
