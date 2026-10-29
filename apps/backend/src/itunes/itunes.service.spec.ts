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

  describe('resolveTrack', () => {
    it('곡명이 일치하는 후보를 해석하고 캐시에 저장한다', async () => {
      const target = makeTrack({ trackId: 10, trackName: 'Toxicity' });
      const noise = makeTrack({ trackId: 11, trackName: 'Different Song' });
      // 곡명 일치 후보가 배열 뒤에 있어도 골라내야 함
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [noise, target] },
      });

      const result = await service.resolveTrack({
        artist: 'System of a Down',
        title: 'Toxicity',
      });

      expect(result).toEqual(target);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^resolve:System of a Down:Toxicity:\d+$/),
        target,
      );
    });

    it('자유텍스트 검색을 사용한다 (attribute=artistTerm 없음)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [makeTrack({ trackName: 'Toxicity' })] },
      });

      await service.resolveTrack({ artist: 'SOAD', title: 'Toxicity' });

      const params = mockedAxios.get.mock.calls[0][1]?.params;
      expect(params.term).toBe('SOAD Toxicity');
      expect(params.attribute).toBeUndefined();
    });

    it('곡명 불일치(조용한 실패) 시 폐기하고 null 반환', async () => {
      // 이센스-불꽃 요청에 민광-First Love가 온 케이스
      mockedAxios.get.mockResolvedValue({
        data: { results: [makeTrack({ trackName: 'First Love' })] },
      });

      const result = await service.resolveTrack({
        artist: '이센스',
        title: '불꽃',
      });

      expect(result).toBeNull();
      // 3개국 모두 불일치 → null 확정 캐시
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^resolve:이센스:불꽃:\d+$/),
        null,
      );
    });

    it('캐시된 해석 결과(트랙)를 API 호출 없이 반환', async () => {
      const cached = makeTrack({ trackName: 'Toxicity' });
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.resolveTrack({
        artist: 'SOAD',
        title: 'Toxicity',
      });

      expect(result).toEqual(cached);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('캐시된 해석 실패(null)를 API 호출 없이 반환', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.resolveTrack({
        artist: 'Unknown',
        title: 'Nope',
      });

      expect(result).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('429 응답 시 폴백 중단하고 캐시하지 않음', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 429 },
      });

      const result = await service.resolveTrack({
        artist: 'IU',
        title: 'Song',
      });

      expect(result).toBeNull();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });
});
