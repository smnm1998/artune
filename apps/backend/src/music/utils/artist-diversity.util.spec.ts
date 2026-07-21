import { ensureArtistDiversity } from './artist-diversity.util';
import { ITunesTrack } from '../../itunes/itunes-track.type';

const makeTrack = (trackId: number, artistName: string): ITunesTrack => ({
  trackId,
  trackName: `Track ${trackId}`,
  artistName,
  collectionName: 'Album',
  artworkUrl100: '',
  trackTimeMillis: 180000,
  previewUrl: 'https://preview',
  trackViewUrl: 'https://view',
});

describe('ensureArtistDiversity', () => {
  it('아티스트당 최대 곡 수 제한 (maxSameArtist=1)', () => {
    const tracks = [
      makeTrack(1, 'A'),
      makeTrack(2, 'A'),
      makeTrack(3, 'B'),
      makeTrack(4, 'B'),
      makeTrack(5, 'C'),
      makeTrack(6, 'D'),
    ];

    const result = ensureArtistDiversity(tracks, 4, 1);
    expect(result).toHaveLength(4);
    expect(result.filter((t) => t.artistName === 'A')).toHaveLength(1);
    expect(result.filter((t) => t.artistName === 'B')).toHaveLength(1);
    expect(result.filter((t) => t.artistName === 'C')).toHaveLength(1);
    expect(result.filter((t) => t.artistName === 'D')).toHaveLength(1);
  });

  it('limit에 도달하면 더 추가하지 않음', () => {
    const tracks = Array.from({ length: 30 }, (_, i) =>
      makeTrack(i, `Artists${i}`),
    );
    expect(ensureArtistDiversity(tracks, 20, 1)).toHaveLength(20);
  });

  it('다양성 보장 후 부족하면 중복 허용해서라도 채움', () => {
    const tracks = [
      makeTrack(1, 'A'),
      makeTrack(2, 'A'),
      makeTrack(3, 'A'),
      makeTrack(4, 'A'),
    ];
    const result = ensureArtistDiversity(tracks, 3, 1);
    expect(result).toHaveLength(3);
  });

  it('빈 배열은 빈 배열 반환', () => {
    expect(ensureArtistDiversity([], 20, 1)).toEqual([]);
  });
});
