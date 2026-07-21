import { mapItunesTrackToFrontend } from './track-mapper.util';
import { ITunesTrack } from '../../itunes/itunes-track.type';

const baseTrack: ITunesTrack = {
  trackId: 12345,
  trackName: 'Hello',
  artistName: 'Adele',
  collectionName: '25',
  artworkUrl100: 'https://example.com/artwork/100x100bb.jpg',
  trackTimeMillis: 295000,
  previewUrl: 'https://example.com/preview.m4a',
  trackViewUrl: 'https://music.apple.com/track/12345',
};

describe('mapItunesTrackToFrontend', () => {
  it('필수 정상 매핑', () => {
    const result = mapItunesTrackToFrontend(baseTrack);
    expect(result.id).toBe('12345');
    expect(result.name).toBe('Hello');
    expect(result.artists).toEqual([{ name: 'Adele' }]);
    expect(result.album.name).toBe('25');
  });

  it('artwork 해상도를 100x100 -> 600x600으로 업스케일', () => {
    const result = mapItunesTrackToFrontend(baseTrack);
    expect(result.album.images[0].url).toBe(
      'https://example.com/artwork/600x600bb.jpg',
    );
  });

  it('previewUrl이 null이어도 preview_url로 null 전달', () => {
    const result = mapItunesTrackToFrontend({ ...baseTrack, previewUrl: null });
    expect(result.preview_url).toBeNull();
  });

  it('artworkUrl100 누락 시 빈 문자열 반환', () => {
    const result = mapItunesTrackToFrontend({
      ...baseTrack,
      artworkUrl100: '',
    });
    expect(result.album.images[0].url).toBe('');
  });
});
