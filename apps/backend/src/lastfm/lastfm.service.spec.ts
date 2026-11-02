import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import axios, { AxiosError } from 'axios';
import { LastfmService } from './lastfm.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LastfmService', () => {
  let service: LastfmService;
  let cacheManager: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    cacheManager = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LastfmService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-key') },
        },
      ],
    }).compile();

    service = module.get<LastfmService>(LastfmService);
    jest.clearAllMocks();

    // jest.mock('axios')는 isAxiosError까지 대체하므로 실제 판별 로직 복원
    mockedAxios.isAxiosError.mockImplementation(
      (payload: any): payload is AxiosError => payload?.isAxiosError === true,
    );
  });

  describe('getSimilarTracks', () => {
    const response = {
      data: {
        similartracks: {
          track: [
            { name: 'Chop Suey!', match: '0.85', artist: { name: 'SOAD' } },
            { name: '', match: '0.5', artist: { name: 'No Title' } },
          ],
        },
      },
    };

    it('캐시 히트 시 API 호출 없이 캐시 결과 반환', async () => {
      const cached = [{ artist: 'SOAD', title: 'Toxicity', match: 0.9 }];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getSimilarTracks('SOAD', 'Aerials');

      expect(result).toEqual(cached);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('응답을 SimilarTrack으로 변환(match는 숫자, 곡명 없는 항목 제외)해 캐시 저장', async () => {
      mockedAxios.get.mockResolvedValue(response);

      const result = await service.getSimilarTracks('SOAD', 'Aerials');

      expect(result).toEqual([
        { artist: 'SOAD', title: 'Chop Suey!', match: 0.85 },
      ]);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'lastfm-similar:SOAD:Aerials',
        result,
      );
    });

    it('유사곡이 실제로 0개인 정상 응답은 빈 배열을 캐시한다', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { similartracks: { track: [] } },
      });

      const result = await service.getSimilarTracks('BewhY', 'Forever');

      expect(result).toEqual([]);
      expect(cacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('네트워크 실패 시 빈 배열을 반환하되 캐시하지 않는다 (일시 장애 오염 방지)', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.getSimilarTracks('IU', '좋은 날');

      expect(result).toEqual([]);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('200 응답 안의 error 필드(무효 키·rate limit)도 캐시하지 않는다', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { error: 29, message: 'Rate Limit Exceeded' },
      });

      const result = await service.getSimilarTracks('IU', '좋은 날');

      expect(result).toEqual([]);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });
});
