export interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  /** 스토어가 달라도 같은 값 — 검색에 없는 곡을 아티스트 곡 목록에서 찾을 때 쓴다 */
  artistId?: number;
  collectionName: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  previewUrl: string | null;
  trackViewUrl: string;
  /** iTunes 장르 라벨 (예: 'Alternative Folk', 'K-Pop') — 운영 로직은 쓰지 않고 측정 기록(probe-picks)에만 남긴다 */
  primaryGenreName?: string;
}
