/**
 * 중복 트랙 제거
 *
 * @param {Array} tracks - 트랙 배열
 * @returns {Array} 중복이 제거될 트랙 배열
 */
export function removeDuplicateTracks(tracks) {
  const trackIds = new Set();
  return tracks.filter((track) => {
    if (trackIds.has(track.id)) {
      return false;
    }
    trackIds.add(track.id);
    return true;
  });
}

/**
 * 같은 앨범명의 트랙 중복 제거 (앨범별로 하나의 트랙만 유지)
 *
 * @param {Array} tracks - 트랙 배열
 * @returns {Array} 앨범 중복이 제거된 트랙 배열
 */
export function removeDuplicateAlbums(tracks) {
  const albumNames = new Set();
  return tracks.filter((track) => {
    const albumName = track.album?.name;
    if (!albumName || albumNames.has(albumName)) {
      return false;
    }
    albumNames.add(albumName);
    return true;
  });
}

/**
 * 인기도 기반 필터링
 *
 * @param {Array} tracks - 트랙 배열
 * @param {number} minPopularity - 최소 인기도 (기본값: 40)
 * @returns {Array} 필터링된 트랙 배열
 */
export function filterByPopularity(tracks, minPopularity = 40) {
  return tracks.filter((track) => track.popularity >= minPopularity);
}

/**
 * 트랙 필터링 파이프라인
 *
 * @param {Array} tracks - 원본 트랙 배열
 * @param {Object} options - 필터링 옵션
 * @returns {Object} 필터링 결과 및 로그
 */
export function filterTracks(
  tracks: any[],
  options: { minPopularity?: number; minResults?: number } = {},
) {
  const { minPopularity = 40, minResults = 20 } = options;

  const uniqueTracks = removeDuplicateTracks(tracks);
  const uniqueAlbums = removeDuplicateAlbums(uniqueTracks);
  const popularTracks = filterByPopularity(uniqueAlbums, minPopularity);
  const finalTracks =
    popularTracks.length >= minResults ? popularTracks : uniqueAlbums;

  return {
    tracks: finalTracks,
    stats: {
      original: tracks.length,
      afterDuplicateRemoval: uniqueTracks.length,
      afterAlbumDuplicateRemoval: uniqueAlbums.length,
      afterPopularityFilter: popularTracks.length,
      final: finalTracks.length,
    },
  };
}
