import { deduplicateByTrackId, shuffleArray } from './track-filter.util';
import { ITunesTrack } from '../../itunes/itunes-track.type';

const makeTrack = (
  trackId: number,
  override: Partial<ITunesTrack> = {},
): ITunesTrack => ({
  trackId,
  trackName: `Track ${trackId}`,
  artistName: 'Artist',
  collectionName: 'Album',
  artworkUrl100: '',
  trackTimeMillis: 180000,
  previewUrl: 'https://preview',
  trackViewUrl: 'https://view',
  ...override,
});

describe('deduplicateByTrackId', () => {
  it('동일한 trackId 중복 제거', () => {
    const tracks = [makeTrack(1), makeTrack(2), makeTrack(1)];
    expect(deduplicateByTrackId(tracks)).toHaveLength(2);
  });

  it('빈 배열 입력 시 빈 배열 반환', () => {
    expect(deduplicateByTrackId([])).toEqual([]);
  });

  it('중복 없는 입력은 원본 그대로 반환', () => {
    const tracks = [makeTrack(1), makeTrack(2), makeTrack(3)];
    expect(deduplicateByTrackId(tracks)).toHaveLength(3);
  });

  it('첫 번째 등장 트랙을 유지', () => {
    const first = makeTrack(1, { trackName: 'First' });
    const dup = makeTrack(1, { trackName: 'Duplicate' });
    const [result] = deduplicateByTrackId([first, dup]);
    expect(result.trackName).toBe('First');
  });
});

describe('shuffleArray', () => {
  it('원본 배열 길이를 보존', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr)).toHaveLength(arr.length);
  });

  it('원본 배열을 mutate 하지 않음', () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it('동일 요소 집합을 유지 (순서만 다름)', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr).sort()).toEqual(arr.sort());
  });

  it('빈 배열은 빈 배열 반환', () => {
    expect(shuffleArray([])).toEqual([]);
  });
});
