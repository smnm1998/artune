import { Injectable, Logger } from '@nestjs/common';
import { ITunesService } from '../itunes/itunes.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import type { PickedTrack } from '../openai/pick-prompt';
import { ExposureWindow, PlaylistMode } from './exposure-window';
import { orderByFreshness } from './utils/freshness-order.util';
import { selectByRegionQuotaLazily } from './utils/region-quota.util';
import { songKey } from './utils/song-key.util';

/** 화면에 내보내는 곡 — 곡 키는 브라우저 이력(localStorage)에 저장돼 다음 요청의 seen으로 돌아온다 */
export interface ServedTrack {
  track: ITunesTrack;
  key: string;
}

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);

  // 동시에 해석하는 곡 수와 묶음 사이 쉼 — iTunes를 몰아 부르면 막힌다(기준선: 요청당 36회 → 81% 차단)
  private readonly RESOLVE_CONCURRENCY = 3;
  private readonly RESOLVE_BATCH_DELAY_MS = 250;

  constructor(
    private readonly itunesService: ITunesService,
    private readonly exposure: ExposureWindow,
  ) {}

  /**
   * LLM이 고른 곡(R2) → 해석 전 후순위(D3: 처음 보는 곡 → 머리 곡 → 이 사람이 본 곡)
   * → 지역 쿼터 규칙대로 필요한 곡만 iTunes 해석 → 노출 기록 → KR 표기.
   * 측정 프로브(scripts/eval/probe-picks.cjs summary의 "D3 후순위" 재생)와 같은 함수·같은 순서다.
   * @param seen 이 사람이 이 모드에서 최근 본 곡 키 (브라우저 이력)
   */
  async servePicks(
    picks: readonly PickedTrack[],
    mode: PlaylistMode,
    seen: readonly string[] = [],
  ): Promise<ServedTrack[]> {
    const heads = this.exposure.heads(mode);
    const seenKeys = new Set(seen);
    const ordered = orderByFreshness(
      picks.map((pick) => ({ ...pick, key: songKey(pick) })),
      { heads, seen: seenKeys },
    );
    const t0 = Date.now();
    let resolved = 0;
    let paused = 0;
    const selected = await selectByRegionQuotaLazily(
      // 정렬한 순서가 곧 순위 — 앞의 곡부터 쿼터를 채운다
      ordered.map((pick, i) => ({ ...pick, match: ordered.length - i })),
      (pick) => {
        resolved++;
        return this.itunesService.resolveTrack({
          artist: pick.artist,
          title: pick.title,
        });
      },
      {
        isFresh: (pick) => !heads.has(pick.key) && !seenKeys.has(pick.key),
        concurrency: this.RESOLVE_CONCURRENCY,
        pause: () => {
          paused++;
          return this.delay(this.RESOLVE_BATCH_DELAY_MS);
        },
      },
    );
    const tResolved = Date.now();
    const keys = selected.map(({ candidate }) => candidate.key);
    this.exposure.record(mode, keys);

    const tracks = await this.itunesService.localizeTracks(
      selected.map(({ track }) => track),
    );
    this.logger.log(
      `[serve] mode=${mode} 선곡 ${picks.length} · 해석 ${resolved}곡 ${tResolved - t0}ms(쉼 ${paused}회) · ` +
        `KR 표기 ${Date.now() - tResolved}ms · 화면 ${selected.length} ` +
        `(머리 곡 ${keys.filter((k) => heads.has(k) && !seenKeys.has(k)).length} · 본 곡 ${keys.filter((k) => seenKeys.has(k)).length})`,
    );
    return tracks.map((track, i) => ({ track, key: keys[i] }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
