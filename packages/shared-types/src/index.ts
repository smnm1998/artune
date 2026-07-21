/**
 * 프론트엔드-백엔드 API 응답 계약 (타입 전용)
 *
 * 백엔드 EmotionService.buildResponse가 실제로 반환하는 형태가 소스 오브 트루스.
 * 런타임 값을 export하지 않으므로 컴파일 시 import가 제거된다 (양쪽 번들에 영향 없음).
 */

export interface Artist {
  name: string;
}

export interface AlbumInfo {
  name: string;
  images: { url: string }[];
}

/** 백엔드 mapItunesTrackToFrontend의 출력 형태 */
export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: AlbumInfo;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

/** 감정 심취(immerse) / 감정 완화(soothe) 각각의 플레이리스트 */
export interface Playlist {
  modeLabel: string;
  description: string;
  tracks: Track[];
}

export interface Artwork {
  url: string;
  prompt: string;
}

/** POST /api/emotion/analyze 응답 및 SSE complete 이벤트의 페이로드 */
export interface EmotionResponse {
  emotionLabel: string;
  description: string;
  artwork: Artwork;
  playlists: {
    immerse: Playlist;
    soothe: Playlist;
  };
}

/* ── SSE (GET /api/emotion/analyze-stream) 이벤트 ── */

export interface ProgressEvent {
  type: 'progress';
  progress: number;
  message: string;
}

export interface CompleteEvent {
  type: 'complete';
  data: EmotionResponse;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

export type EmotionStreamEvent = ProgressEvent | CompleteEvent | ErrorEvent;
