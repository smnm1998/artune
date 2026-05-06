export function deduplicateByTrackId(tracks: any[]): any[] {
  const seen = new Set<number>();
  return tracks.filter((track) => {
    if (seen.has(track.trackId)) return false;
    seen.add(track.trackId);
    return true;
  });
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
