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
  /** 이 곡의 Apple Music 주소(KR 스토어) — 화면의 "Apple Music에서 듣기" 배지가 여기로 연결된다 */
  appleMusicUrl: string;
  /** 곡 키(정규화한 곡명의 8자 해시) — 브라우저 이력에 저장해 다음 요청의 seen으로 보낸다 */
  key: string;
}

export type PlaylistMode = 'immerse' | 'soothe';

/**
 * 이 사람이 최근 본 곡 키 — 모드별 최근 40곡(브라우저 localStorage).
 * 서버는 이 곡들을 지우지 않고 화면 순서에서 뒤로 미룬다.
 * SSE 요청에서는 쿼리 seenImmerse·seenSoothe에 쉼표로 이어 보낸다.
 */
export type SeenHistory = Record<PlaylistMode, string[]>;

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

/** POST /api/emotion/analyze 요청 본문 */
export interface AnalyzeRequest {
  text: string;
  seen?: Partial<SeenHistory>;
}

/** POST /api/emotion/analyze 응답 및 SSE complete 이벤트의 페이로드 */
export interface EmotionResponse {
  emotionLabel: string;
  description: string;
  /** 자해·자살 위기 신호 — true면 화면에 상담 안내(109)를 띄운다 */
  crisis: boolean;
  artwork: Artwork;
  playlists: {
    immerse: Playlist;
    soothe: Playlist;
  };
}

/* ── 스트림 이벤트 (POST /api/emotion/analyze-stream, SSE 형식 — 전환 기간의 GET도 같은 형식) ── */

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
