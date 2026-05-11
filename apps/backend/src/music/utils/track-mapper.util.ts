import { ITunesTrack } from 'src/itunes/itunes-track.type';

export function mapItunesTrackToFrontend(track: ITunesTrack) {
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
    duration_ms: track.trackTimeMillis,
    preview_url: track.previewUrl ?? null,
    external_urls: {
      spotify: track.trackViewUrl,
    },
  };
}
