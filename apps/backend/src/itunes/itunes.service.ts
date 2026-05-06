import { Injectable } from '@nestjs/common';
import axios from 'axios';

/**
 * iTunes Search API 서비스
 *
 * - 30초 preview URL 제공
 * - Rate limit: ~20 calls/min
 * - 인증 x
 */
@Injectable()
export class ITunesService {
  static BASE_URL = 'https://itunes.apple.com/search';

  /**
   * 아티스트명과 트랙명으로 preview URL 검색 (국가별 순차 검색 적용)
   * 우선순위: 한국(kr) -> 일본(jp) -> 미국(us)
   *
   * @param {string} artistName - 아티스트 이름
   * @param {string} trackName - 트랙 이름
   * @returns {Promise<string|null>} 30초 미리듣기 URL
   */
  async getPreviewUrl(artistName, trackName) {
    // 검색할 국가 순서
    const countries = ['kr', 'jp', 'us'];

    for (const country of countries) {
      try {
        const response = await axios.get(ITunesService.BASE_URL, {
          params: {
            term: `${artistName} ${trackName}`,
            media: 'music',
            entity: 'song',
            limit: 1, // 가장 연관성 높은 1개만 조회
            country: country,
          },
          timeout: 5000,
        });

        const results = response.data.results;
        if (results && results.length > 0 && results[0].previewUrl) {
          // 찾았으면 바로 반환 (다음 국가 검색 안 함)
          return results[0].previewUrl;
        }
      } catch (error) {
        // 해당 국가에서 에러 발생 시(404, 403 등) 무시하고 다음 국가로 진행
        continue;
      }
    }

    // 모든 국가에서 실패한 경우
    console.error(
      `iTunes API failed: ${artistName} - ${trackName} (Not found in KR, JP, US)`,
    );
    return null;
  }

  /**
   * 여러 트랙의 preview URL을 배치로 가져옴
   *
   * @param {Array<{artistName: string, trackName: string, id: string}>} tracks
   * @returns {Promise<Map<string, string>>} trackId - previewUrl 맵
   */
  async getPreviewUrlsBatch(tracks) {
    const previewMap = new Map();

    for (const track of tracks) {
      const previewUrl = await this.getPreviewUrl(
        track.artistName,
        track.trackName,
      );
      if (previewUrl) {
        previewMap.set(track.id, previewUrl);
      }

      // 국가별로 최대 3번까지 요청할 수 있으므로 딜레이를 약간 넉넉하게 조정 (권장)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return previewMap;
  }
}
