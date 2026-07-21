import { ITunesTrack } from '../../itunes/itunes-track.type';
import { matchesGenres, preferMatchingGenres } from './genre-match.util';

const makeTrack = (
  trackId: number,
  primaryGenreName?: string,
): ITunesTrack => ({
  trackId,
  trackName: `Song ${trackId}`,
  artistName: `Artist ${trackId}`,
  collectionName: 'Album',
  artworkUrl100: 'https://test.com/100x100bb.jpg',
  trackTimeMillis: 200000,
  previewUrl: 'https://preview',
  trackViewUrl: 'https://view',
  primaryGenreName,
});

describe('matchesGenres', () => {
  it('별칭(alias)을 통해 느슨하게 매칭한다', () => {
    // iTunes 라벨이 거칠어도 substring으로 잡힘
    expect(matchesGenres(makeTrack(1, 'Alternative Folk'), ['folk'])).toBe(
      true,
    );
    expect(
      matchesGenres(makeTrack(2, 'Singer/Songwriter'), ['singer-songwriter']),
    ).toBe(true);
    expect(matchesGenres(makeTrack(3, 'K-Pop'), ['k-pop'])).toBe(true);
    expect(matchesGenres(makeTrack(4, 'Hip-Hop/Rap'), ['hip hop'])).toBe(true);
    expect(matchesGenres(makeTrack(5, 'R&B/Soul'), ['r&b'])).toBe(true);
  });

  it('무관한 장르는 매칭하지 않는다', () => {
    expect(matchesGenres(makeTrack(1, 'Dance'), ['jazz'])).toBe(false);
    expect(matchesGenres(makeTrack(2, 'Classical'), ['hip hop'])).toBe(false);
  });

  it('primaryGenreName이 없으면 false', () => {
    expect(matchesGenres(makeTrack(1), ['pop'])).toBe(false);
  });

  it('별칭 사전에 없는 장르는 이름 자체로 매칭한다', () => {
    expect(matchesGenres(makeTrack(1, 'Reggae'), ['reggae'])).toBe(true);
  });
});

describe('preferMatchingGenres', () => {
  it('매칭 트랙을 앞에 배치하고 비매칭도 버리지 않는다', () => {
    const jazz1 = makeTrack(1, 'Jazz');
    const dance = makeTrack(2, 'Dance');
    const jazz2 = makeTrack(3, 'Vocal Jazz');

    const result = preferMatchingGenres([dance, jazz1, jazz2], ['jazz']);

    expect(result).toEqual([jazz1, jazz2, dance]);
    expect(result).toHaveLength(3); // 소프트 필터 — 제거 없음
  });

  it('장르 미지정 시 순서를 유지한다', () => {
    const tracks = [makeTrack(1, 'Dance'), makeTrack(2, 'Jazz')];
    expect(preferMatchingGenres(tracks, [])).toEqual(tracks);
  });
});
