export interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  previewUrl: string | null;
  trackViewUrl: string;
  /** iTunes 장르 라벨 (예: 'Alternative Folk', 'K-Pop') — 모드별 장르 소프트 필터에 사용 */
  primaryGenreName?: string;
}
