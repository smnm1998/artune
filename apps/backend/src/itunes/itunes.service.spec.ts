import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ITunesService } from './itunes.service';
import { ITunesTrack } from './itunes-track.type';
import axios, { AxiosError } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const makeTrack = (overrides: Partial<ITunesTrack> = {}): ITunesTrack => ({
  trackId: 1,
  trackName: 'Test Song',
  artistName: 'IU',
  collectionName: 'Test Album',
  artworkUrl100: 'https://test.com/100x100bb.jpg',
  trackTimeMillis: 200000,
  previewUrl: 'https://preview',
  trackViewUrl: 'https://view',
  ...overrides,
});

describe('ITunesService', () => {
  let service: ITunesService;
  let cacheManager: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    cacheManager = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ITunesService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<ITunesService>(ITunesService);
    jest.clearAllMocks();

    // jest.mock('axios')는 isAxiosError까지 대체하므로 실제 판별 로직 복원
    mockedAxios.isAxiosError.mockImplementation(
      (payload: any): payload is AxiosError => payload?.isAxiosError === true,
    );
  });

  describe('getArtistTopTracks', () => {
    it('캐시 히트 시 API 호출 없이 캐시 결과 반환', async () => {
      const cached = [makeTrack()];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getArtistTopTracks('IU');

      expect(result).toEqual(cached);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('첫 국가(kr)에서 발견 시 즉시 반환하고 캐시 저장', async () => {
      const track = makeTrack();
      mockedAxios.get.mockResolvedValue({ data: { results: [track] } });

      const result = await service.getArtistTopTracks('IU');

      expect(result).toEqual([track]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(ITunesService.BASE_URL, {
        params: {
          term: 'IU',
          attribute: 'artistTerm',
          media: 'music',
          entity: 'song',
          limit: 3,
          country: 'kr',
        },
        timeout: 8000,
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^artist-tracks:IU:\d+$/),
        [track],
      );
    });

    it('kr에 결과 없으면 us → jp 순으로 폴백', async () => {
      const track = makeTrack();
      mockedAxios.get
        .mockResolvedValueOnce({ data: { results: [] } })
        .mockResolvedValueOnce({ data: { results: [track] } });

      const result = await service.getArtistTopTracks('Aimer');

      expect(result).toEqual([track]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get.mock.calls[0][1]?.params.country).toBe('kr');
      expect(mockedAxios.get.mock.calls[1][1]?.params.country).toBe('us');
    });

    it('429 응답 시 남은 국가 폴백을 중단하고 캐시하지 않음', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 429 },
      });

      const result = await service.getArtistTopTracks('IU');

      expect(result).toEqual([]);
      // 호출 증폭 방지: 3개국 순회하지 않고 1회로 끝
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      // 캐시 오염 방지: 일시적 차단이 6시간 빈 결과로 박히면 안 됨
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('403도 rate limit으로 간주해 동일하게 처리', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 403 },
      });

      const result = await service.getArtistTopTracks('IU');

      expect(result).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('네트워크 에러는 다음 국가를 시도하되 빈 결과를 캐시하지 않음', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout'));

      const result = await service.getArtistTopTracks('IU');

      expect(result).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // kr, us, jp 모두 시도
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('3개국 모두 정상 응답 + 결과 없음이면 빈 배열 캐시 (재시도 방지)', async () => {
      mockedAxios.get.mockResolvedValue({ data: { results: [] } });

      const result = await service.getArtistTopTracks('없는아티스트');

      expect(result).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^artist-tracks:없는아티스트:\d+$/),
        [],
      );
    });

    it('previewUrl 없는 트랙과 블랙리스트 앨범 필터링', async () => {
      const good = makeTrack({ trackId: 1 });
      const noPreview = makeTrack({ trackId: 2, previewUrl: null });
      const karaoke = makeTrack({
        trackId: 3,
        collectionName: 'Karaoke Best Collection',
      });
      mockedAxios.get.mockResolvedValue({
        data: { results: [good, noPreview, karaoke] },
      });

      const result = await service.getArtistTopTracks('IU');

      expect(result).toEqual([good]);
    });
  });

  describe('getTracksForArtists', () => {
    it('빈 배열 입력 시 API 호출 없이 빈 결과 반환', async () => {
      const result = await service.getTracksForArtists([]);

      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('아티스트별 결과를 합치고 trackId 중복 제거', async () => {
      const t1 = makeTrack({ trackId: 1 });
      const t1dup = makeTrack({ trackId: 1, artistName: 'BTS' });
      const t2 = makeTrack({ trackId: 2, artistName: 'BTS' });
      mockedAxios.get
        .mockResolvedValueOnce({ data: { results: [t1] } })
        .mockResolvedValueOnce({ data: { results: [t1dup, t2] } });

      const result = await service.getTracksForArtists(['IU', 'BTS']);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.trackId)).toEqual([1, 2]);
    });

    it('CONCURRENCY 초과 인원도 배치로 나눠 전원 조회', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { results: [makeTrack()] },
      });

      await service.getTracksForArtists(['A', 'B', 'C', 'D']);

      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // 3 + 1 배치
    });
  });
});
