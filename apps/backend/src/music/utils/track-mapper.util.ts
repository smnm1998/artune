import type { Track } from '@artune/shared-types';
import type { ITunesTrack } from '../../itunes/itunes-track.type';

/** @param key 곡 키(songKey) — 브라우저 이력에 저장된다 */
export function mapItunesTrackToFrontend(
  track: ITunesTrack,
  key: string,
): Track {
  return {
    id: String(track.trackId),
    name: track.trackName,
    artists: [{ name: track.artistName }],
    album: {
      name: track.collectionName,
      images: [
        { url: track.artworkUrl100?.replace('100x100bb', '600x600bb') ?? '' },
      ],
    },
    preview_url: track.previewUrl ?? null,
    appleMusicUrl: track.trackViewUrl,
    key,
  };
}
