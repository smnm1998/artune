import { Injectable, Logger } from '@nestjs/common';
import { ITunesService } from '../itunes/itunes.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import type { PickedTrack } from '../openai/pick-prompt';
import { ExposureWindow, PlaylistMode } from './exposure-window';
import { orderByFreshness } from './utils/freshness-order.util';
import {
  selectByRegionQuotaLazily,
  selectByRegionQuotaStream,
} from './utils/region-quota.util';
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
  /**
   * 스트리밍의 KR 표기 조회 사이 최소 간격 — 곡이 0.2~0.3초마다 골라져서, 간격 없이 "조회가 없으면 바로"만 하면
   * 사실상 곡마다 조회가 된다(모의 측정 모드당 6~9회). 1.5초면 모드당 3번쯤(요청당 +4회 안팎)
   */
  private krLookupGapMs = 1500;

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

  /**
   * servePicks의 스트리밍 판 — AI가 곡을 쓰는 대로 받아 같은 규칙으로 고르고, KR 표기를 마친 곡부터 하나씩 내보낸다.
   * 최종 목록·순서는 곡이 다 모인 뒤 servePicks와 같다 (쿼터 스트리밍 판이 게으른 판과 같은 결과·같은 해석).
   * - 순위(처음 보는 곡 → 머리 곡 → 본 곡, 같은 묶음 안에서는 AI가 쓴 순서)는 곡이 도착할 때 매긴다 — 머리 곡·이력은 요청 시작 때 정해져 있다
   * - KR 표기: 첫 곡은 바로 조회하고, 그 뒤 조회는 앞 조회에서 krLookupGapMs가 지난 뒤 그동안 고른 곡을 모아 한 번에 한다.
   *   고르기가 끝나면 남은 곡은 기다리지 않고 바로 조회한다 → 카드는 처음부터 한글 표기로 뜨고, 조회는 모드당 몇 번으로 끝난다
   * - AI 스트림이 실패하면 진행 중인 해석도 멈추고 그 오류를 던진다
   * @param onTrack 화면에 낼 곡 하나 (최종 순서대로, index는 이 모드에서 몇 번째인지)
   * @param signal 취소 (연결이 끊긴 요청) — 새 해석을 시작하지 않는다
   */
  async servePicksStream(
    picks: AsyncIterable<PickedTrack>,
    mode: PlaylistMode,
    seen: readonly string[] = [],
    {
      onTrack,
      signal,
    }: {
      onTrack?: (served: ServedTrack, index: number) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<ServedTrack[]> {
    const heads = this.exposure.heads(mode);
    const seenKeys = new Set(seen);
    const stop = new AbortController();
    const t0 = Date.now();
    let resolved = 0;
    let lookups = 0;
    let firstAt: number | null = null;

    // 고른 순서대로 KR 표기 → 내보내기. 조회를 기다리는 동안 고른 곡은 pending에 모인다
    const served: ServedTrack[] = [];
    let pending: ServedTrack[] = [];
    let localizing: Promise<void> | null = null;
    let lastLookupAt = 0;
    let hurry = false; // 고르기가 끝났거나 멈췄다 — 더 모을 곡이 없으니 기다리지 않는다
    const early: { wake?: () => void } = {}; // 기다림을 일찍 끝낸다
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        early.wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    const localize = async () => {
      while (pending.length > 0) {
        const gap = lastLookupAt + this.krLookupGapMs - Date.now();
        if (gap > 0 && !hurry) await wait(gap);
        early.wake = undefined;
        lastLookupAt = Date.now();
        const batch = pending;
        pending = [];
        lookups++;
        const tracks = await this.itunesService.localizeTracks(
          batch.map(({ track }) => track),
        );
        batch.forEach(({ key }, i) => {
          const item = { track: tracks[i], key };
          served.push(item);
          firstAt ??= Date.now();
          onTrack?.(item, served.length - 1);
        });
      }
      localizing = null;
    };

    const quota = selectByRegionQuotaStream<
      PickedTrack & { key: string; match: number }
    >(
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
        onTake: ({ candidate, track }) => {
          pending.push({ track, key: candidate.key });
          localizing ??= localize();
        },
        signal: signal ? AbortSignal.any([signal, stop.signal]) : stop.signal,
      },
    );

    let count = 0;
    try {
      for await (const pick of picks) {
        const key = songKey(pick);
        const tier = seenKeys.has(key) ? 2 : heads.has(key) ? 1 : 0;
        quota.push({ ...pick, key, match: (2 - tier) * 1000 - count++ });
      }
    } catch (error) {
      stop.abort(error);
      quota.result.catch(() => {});
      hurry = true;
      early.wake?.();
      throw error;
    }
    quota.end();
    const selected = await quota.result.finally(() => {
      hurry = true;
      early.wake?.();
    });
    const keys = selected.map(({ candidate }) => candidate.key);
    this.exposure.record(mode, keys);
    while (localizing) await localizing;

    this.logger.log(
      `[serve] mode=${mode} 스트림 · 선곡 ${count} · 해석 ${resolved}곡 · 첫 곡 ${firstAt != null ? `${firstAt - t0}ms` : '없음'} · ` +
        `끝 ${Date.now() - t0}ms · KR 조회 ${lookups}회 · 화면 ${served.length} ` +
        `(머리 곡 ${keys.filter((k) => heads.has(k) && !seenKeys.has(k)).length} · 본 곡 ${keys.filter((k) => seenKeys.has(k)).length})`,
    );
    return served;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
