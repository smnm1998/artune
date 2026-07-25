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

  // 지역별로 iTunes 해석을 시도할 최대 후보 수 (쿼터의 여유분)
  private readonly RESOLVE_CAP: Record<Region, number> = {
    korea: 12,
    pop: 8,
    jpop: 5,
  };

  constructor(
    private readonly itunesService: ITunesService,
    private readonly lastfmService: LastfmService,
  ) {}

  /**
   * 지역별 시드곡 → Last.fm 협업필터링 확장 → iTunes 해석 → 지역 쿼터(6:3:1) 선정
   */
  async getRecommendations(
    seeds: ModeSeeds,
    mode = '',
  ): Promise<ITunesTrack[]> {
    // 1. 지역별로 시드 + 유사곡을 후보로 수집
    const byRegion = await this.collectCandidates(seeds);

    // 2. 지역별 후보를 match 순 상위 N개로 제한 (iTunes 호출 수 통제)
    const capped: Candidate[] = [];
    for (const region of ['korea', 'pop', 'jpop'] as Region[]) {
      const sorted = byRegion[region].sort((a, b) => b.match - a.match);
      capped.push(...sorted.slice(0, this.RESOLVE_CAP[region]));
    }

    // 3. iTunes 해석 (region/match 보존)
    const resolved = await this.itunesService.resolveMany(capped, (c) => ({
      artist: c.artist,
      title: c.title,
    }));

    const regioned: RegionedTrack[] = resolved.map(({ item, track }) => ({
      track,
      region: item.region,
      match: item.match,
    }));

    this.logger.log(
      `[resolve] mode=${mode || '-'} resolved=${regioned.length}/${capped.length} ` +
        `(korea/pop/jpop 후보 ${byRegion.korea.length}/${byRegion.pop.length}/${byRegion.jpop.length})`,
    );

    // 4. 지역 쿼터로 최종 10곡 선정 (부족 시 타 지역 보충)
    const result = selectByRegionQuota(regioned);

    this.logger.log(
      `[region-quota] mode=${mode || '-'} 최종 ${result.length}곡 ` +
        `korea=${this.countRegion(result, regioned, 'korea')} ` +
        `pop=${this.countRegion(result, regioned, 'pop')} ` +
        `jpop=${this.countRegion(result, regioned, 'jpop')}`,
    );

    return result;
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
}
