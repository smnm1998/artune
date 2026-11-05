import { createHash } from 'node:crypto';
import { normalizeArtist } from '../../itunes/track-artist-match.util';
import { normalizeTitle } from '../../itunes/track-title-match.util';

/**
 * LLM이 고른 곡의 키 — 전체 노출 기록과 사용자 이력(브라우저 localStorage)에서 같은 곡을 알아본다.
 * - 순서는 해석(iTunes) 전에 정해야 해서 trackId가 아니라 LLM 표기(아티스트·곡명)로 만든다.
 *   브라우저가 해석하더라도(R3) 같은 키가 나온다.
 * - 대소문자·공백·기호·(feat. …) 차이는 같은 곡으로 본다 ('IU|Love poem' = 'iu|Love Poem')
 * - 16진수 8자: 이력 40곡을 두 모드 모두 GET 쿼리로 보내도 ~720자
 * - 한계: 표기가 다른 같은 곡(DAY6 ↔ 데이식스)은 다른 키다
 */
export function songKey(song: { artist: string; title: string }): string {
  const normalized = `${normalizeArtist(song.artist)}|${normalizeTitle(song.title)}`;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 8);
}
