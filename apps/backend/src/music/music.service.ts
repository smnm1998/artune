import { Injectable, Logger } from '@nestjs/common';
import { ITunesService, TrackQuery } from '../itunes/itunes.service';
import { ITunesTrack } from '../itunes/itunes-track.type';
import { LastfmService } from '../lastfm/lastfm.service';
import {
  selectByRegionQuota,
  Region,
  RegionedTrack,
} from './utils/region-quota.util';

/** LLM이 반환하는 지역별 시드곡 */
export interface ModeSeeds {
  korea: TrackQuery[];
  pop: TrackQuery[];
  jpop: TrackQuery[];
}

/** 지역 태그 + match를 실은 후보 (iTunes 해석 전) */
interface Candidate extends TrackQuery {
  region: Region;
  match: number;
}

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);

  // 지역별 '해석 시도 상한' — 해석이 잘 안 될 때 iTunes 호출 폭주(=throttle) 방지
  private readonly RESOLVE_CAP: Record<Region, number> = {
    korea: 12,
    pop: 8,
    jpop: 5,
  };
  // 지역별 '목표 해석 수' = 쿼터(6:3:1) + dedup·타지역 보충 여유분.
  // 해석률이 좋으면 이만큼에서 조기 종료해 불필요한 iTunes 호출을 줄인다.
  private readonly RESOLVE_NEED: Record<Region, number> = {
    korea: 8,
    pop: 5,
    jpop: 3,
  };
  private readonly RESOLVE_CONCURRENCY = 3;
  private readonly RESOLVE_BATCH_DELAY_MS = 250;

  constructor(
    private readonly itunesService: ITunesService,
    private readonly lastfmService: LastfmService,
  ) {}

  /**
   * 지역별 시드곡 → Last.fm 협업필터링 확장 → iTunes 해석 → 지역 쿼터(6:3:1) 선정.
   * 해석은 match 순으로 하되 목표 수(NEED)가 차면 조기 종료한다.
   * (해석률 ~90%라 후보를 전부 해석하면 대부분 버려지고 iTunes만 throttle됨 — 실측 근거)
   */
  async getRecommendations(
    seeds: ModeSeeds,
    mode = '',
  ): Promise<ITunesTrack[]> {
    // 1. 지역별로 시드 + 유사곡을 후보로 수집
    const byRegion = await this.collectCandidates(seeds);

    // 2. 지역별로 match 순 조기종료 해석 (상한 CAP 내에서 목표 NEED까지)
    const regioned: RegionedTrack[] = [];
    let tried = 0;
    for (const region of ['korea', 'pop', 'jpop'] as Region[]) {
      const pool = [...byRegion[region]]
        .sort((a, b) => b.match - a.match)
        .slice(0, this.RESOLVE_CAP[region]);
      const r = await this.resolveUntil(pool, region, this.RESOLVE_NEED[region]);
      regioned.push(...r.resolved);
      tried += r.tried;
    }

    this.logger.log(
      `[resolve] mode=${mode || '-'} resolved=${regioned.length}/${tried}시도 ` +
        `(korea/pop/jpop 후보 ${byRegion.korea.length}/${byRegion.pop.length}/${byRegion.jpop.length})`,
    );

    // 3. 지역 쿼터로 최종 10곡 선정 (부족 시 타 지역 보충)
    const result = selectByRegionQuota(regioned);

    this.logger.log(
      `[region-quota] mode=${mode || '-'} 최종 ${result.length}곡 ` +
        `korea=${this.countRegion(result, regioned, 'korea')} ` +
        `pop=${this.countRegion(result, regioned, 'pop')} ` +
        `jpop=${this.countRegion(result, regioned, 'jpop')}`,
    );

    return result;
  }

  /**
   * 후보를 match 순으로 iTunes 해석하되, need개가 해석되면 조기 종료한다.
   * 배치(CONCURRENCY) 단위로 호출하며 배치 간 딜레이로 rate limit을 완화한다.
   * @returns 해석된 트랙과 실제 시도 횟수
   */
  private async resolveUntil(
    candidates: Candidate[],
    region: Region,
    need: number,
  ): Promise<{ resolved: RegionedTrack[]; tried: number }> {
    const resolved: RegionedTrack[] = [];
    let tried = 0;

    for (
      let i = 0;
      i < candidates.length && resolved.length < need;
      i += this.RESOLVE_CONCURRENCY
    ) {
      const batch = candidates.slice(i, i + this.RESOLVE_CONCURRENCY);
      tried += batch.length;
      const tracks = await Promise.all(
        batch.map((c) =>
          this.itunesService.resolveTrack({ artist: c.artist, title: c.title }),
        ),
      );
      batch.forEach((c, j) => {
        const track = tracks[j];
        if (track) resolved.push({ track, region, match: c.match });
      });

      const hasMore = i + this.RESOLVE_CONCURRENCY < candidates.length;
      if (hasMore && resolved.length < need) {
        await this.delay(this.RESOLVE_BATCH_DELAY_MS);
      }
    }

    return { resolved, tried };
  }

  /** 시드별 Last.fm 확장 → 지역별 후보 맵. 시드 자체도 match=1.0 후보로 포함 */
  private async collectCandidates(
    seeds: ModeSeeds,
  ): Promise<Record<Region, Candidate[]>> {
    const regions: Region[] = ['korea', 'pop', 'jpop'];

    const perRegion = await Promise.all(
      regions.map(async (region) => {
        const seedList = seeds[region] ?? [];
        const expanded = await Promise.all(
          seedList.map(async (seed) => {
            const similar = await this.lastfmService.getSimilarTracks(
              seed.artist,
              seed.title,
            );
            // 시드 자체(match 1.0) + 유사곡들
            return [
              { ...seed, region, match: 1.0 },
              ...similar.map((s) => ({
                artist: s.artist,
                title: s.title,
                region,
                match: s.match,
              })),
            ] as Candidate[];
          }),
        );
        return { region, candidates: this.dedupe(expanded.flat()) };
      }),
    );

    const map = { korea: [], pop: [], jpop: [] } as Record<Region, Candidate[]>;
    for (const { region, candidates } of perRegion) map[region] = candidates;
    return map;
  }

  /** artist+title 기준 중복 제거 (같은 곡이 여러 시드에서 나올 수 있음) */
  private dedupe(candidates: Candidate[]): Candidate[] {
    const seen = new Set<string>();
    const out: Candidate[] = [];
    for (const c of candidates) {
      const key = `${c.artist}|${c.title}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }

  /** 로그용 — 최종 결과 중 특정 지역 곡 수 */
  private countRegion(
    result: ITunesTrack[],
    regioned: RegionedTrack[],
    region: Region,
  ): number {
    const ids = new Set(
      regioned.filter((r) => r.region === region).map((r) => r.track.trackId),
    );
    return result.filter((t) => ids.has(t.trackId)).length;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
