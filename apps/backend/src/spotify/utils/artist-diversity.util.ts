/**
 * 아티스트 다양성을 보장하면서 트랙 선택
 *
 * @param {Array} tracks - 정렬된 트랙 배열
 * @param {number} limit - 선택할 트랙 수
 * @param {number} maxSameArtist - 동일 아티스트의 최대 곡 수 (기본값: 2)
 * @returns {Array} 다양성이 보장된 트랙 배열
 */
export function ensureArtistDiversity(
  tracks: any[],
  limit = 20,
  maxSameArtist = 2,
): any[] {
  const selectedTracks = [];
  const artistCount = new Map();

  for (const item of tracks) {
    if (selectedTracks.length >= limit) break;

    const artistId = item.track.artists[0]?.id;
    const currentCount = artistCount.get(artistId) || 0;

    if (currentCount < maxSameArtist) {
      selectedTracks.push(item);
      artistCount.set(artistId, currentCount + 1);
    }
  }
  // limit에 도달하지 못한 경우 나머지 추가
  if (selectedTracks.length < limit) {
    for (const item of tracks) {
      if (selectedTracks.length >= limit) break;
      if (!selectedTracks.includes(item)) {
        selectedTracks.push(item);
      }
    }
  }
  return selectedTracks;
}

/**
 * 아티스트 분포 통계
 *
 * @param {Array} tracks - 트랙 배열
 * @returns {Object} 아티스트별 곡 수
 */
export function getArtistDistribution(tracks) {
  const distribution = {};

  tracks.forEach((item) => {
    const artistName = item.track.artists[0]?.name;
    if (artistName) {
      distribution[artistName] = (distribution[artistName] || 0) + 1;
    }
  });
  return distribution;
}
