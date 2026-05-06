/**
 * Spotify 트랙 객체를 DTO로 변환
 *
 * @param {Object} track - spotify 트랙 객체
 * @returns {Object} 트랙 DTO
 */
export function mapTrackToDTO(track) {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist) => ({
      name: artist.name,
      id: artist.id,
    })),
    album: {
      id: track.album.id,
      name: track.album.name,
      imageUrl: track.album.images[0]?.url,
      totalTracks: track.album.total_tracks,
      releaseDate: track.album.release_date,
      spotifyUrl: track.album.external_urls.spotify,
    },
    previewUrl: track.preview_url,
    spotifyUrl: track.external_urls.spotify,
    popularity: track.popularity,
    duration: track.duration_ms,
  };
}

/**
 * 복수 track 배열을 DTO 배열로 변환
 */
export function mapTracksToDTO(tracks) {
  return tracks.map(mapTrackToDTO);
}

/**
 * 백엔드 DTO를 프론트엔드 형식으로 변환
 *
 * @param {Object} track - 백엔드 track DTO
 * @returns {Object} 프론트엔드가 기대하는 track 형식
 */
export function mapToFrontendTrack(track) {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: {
      name: track.album.name,
      images: [{ url: track.album.imageUrl }],
    },
    duration_ms: track.duration,
    preview_url: track.previewUrl,
    external_urls: {
      spotify: track.spotifyUrl,
    },
  };
}
