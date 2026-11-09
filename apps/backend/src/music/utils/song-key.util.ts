import { createHash } from 'node:crypto';
import { normalizeTitle } from '../../itunes/track-title-match.util';

/**
 * LLM이 고른 곡의 키 — 전체 노출 기록과 사용자 이력(브라우저 localStorage)에서 같은 곡을 알아본다.
 * - 순서는 해석(iTunes) 전에 정해야 해서 trackId가 아니라 LLM 표기로 만든다.
 *   브라우저가 해석하더라도(R3) 같은 키가 나온다.
 * - 정규화한 곡명만 쓴다: 같은 곡이 아티스트 표기만 달리 오는 일('아이유'/'IU', 'DAY6'/'데이식스')이
 *   곡명이 같은 다른 곡보다 잦다. 11/6 D4 두 회차에서 아티스트 표기로 갈라진 곡이 밤편지 노출 10번 중 4번을
 *   처음 보는 곡으로 통과시켰고, 곡명만 같은 다른 곡은 '혁오/(G)I-DLE - TOMBOY' 1건이었다.
 *   겹쳐도 곡을 빼지 않고 뒤로 미룰 뿐이다
 * - 대소문자·공백·기호·(feat. …) 차이는 같은 곡으로 본다 ('Love poem' = 'Love Poem')
 * - 16진수 8자: 이력 40곡을 두 모드 모두 GET 쿼리로 보내도 ~720자
 */
export function songKey(song: { title: string }): string {
  return createHash('sha256')
    .update(normalizeTitle(song.title))
    .digest('hex')
    .slice(0, 8);
}
