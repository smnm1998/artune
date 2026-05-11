import { ITunesTrack } from 'src/itunes/itunes-track.type';

export function ensureArtistDiversity(
  tracks: ITunesTrack[],
  limit = 20,
  maxSameArtist = 2,
): ITunesTrack[] {
  const selected: ITunesTrack[] = [];
  const artistCount = new Map<string, number>();

  for (const track of tracks) {
    if (selected.length >= limit) break;
    const artistName = track.artistName; // iTunes 필드
    const count = artistCount.get(artistName) ?? 0;
    if (count < maxSameArtist) {
      selected.push(track);
      artistCount.set(artistName, count + 1);
    }
  }

  if (selected.length < limit) {
    for (const track of tracks) {
      if (selected.length >= limit) break;
      if (!selected.includes(track)) selected.push(track);
    }
  }

  return selected;
}
