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
  /** iTunes 장르 라벨 (예: 'Alternative Folk', 'K-Pop') — 모드별 장르 소프트 필터에 사용 */
  primaryGenreName?: string;
}
