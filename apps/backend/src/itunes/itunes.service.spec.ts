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
        'resolve:System of a Down:Toxicity',
        target,
      );
    });

    it('자유텍스트 검색을 사용한다 (attribute=artistTerm 없음)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [makeTrack({ trackName: 'Toxicity' })] },
      });

      await service.resolveTrack({ artist: 'SOAD', title: 'Toxicity' });

      // axios 1.21부터 params가 제네릭 타입이라 mock 호출 기록에선 unknown으로 추론된다
      const [, config] = mockedAxios.get.mock.calls[0];
      const params = config?.params as Record<string, unknown>;
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
        'resolve:이센스:불꽃',
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

  describe('품질 필터', () => {
    // filterQualityTracks 는 private 이라 resolveTrack 경유로 검증한다
    const resolveWith = (overrides: Partial<ITunesTrack>) => {
      const track = makeTrack(overrides);
      mockedAxios.get.mockResolvedValue({ data: { results: [track] } });
      return service.resolveTrack({ artist: 'A', title: track.trackName });
    };

    it.each([
      {
        name: 'Discovery',
        overrides: { trackName: 'One More Time', collectionName: 'Discovery' },
      },
      {
        name: 'Recovery',
        overrides: { trackName: 'Lose Yourself', collectionName: 'Recovery' },
      },
      { name: 'The Greatest', overrides: { trackName: 'The Greatest' } },
      { name: 'Undercover', overrides: { trackName: 'Undercover Martyn' } },
      { name: 'Whitsunday', overrides: { trackName: 'Whitsunday' } },
    ])(
      '블랙리스트 단어가 다른 단어의 일부일 뿐이면 통과시킨다: $name',
      async ({ overrides }) => {
        expect(await resolveWith(overrides)).not.toBeNull();
      },
    );

    it.each([
      { name: 'cover', overrides: { collectionName: 'Cover Songs' } },
      { name: 'karaoke', overrides: { trackName: 'Hello (Karaoke Version)' } },
      { name: 'hits', overrides: { collectionName: 'Greatest Hits' } },
      { name: 'best of', overrides: { collectionName: 'The Best Of IU' } },
      { name: 'tribute', overrides: { collectionName: 'Tribute to Queen' } },
      { name: 'sleep sounds', overrides: { collectionName: 'Sleep Sounds' } },
      { name: 'previewUrl 없음', overrides: { previewUrl: null } },
    ])(
      '블랙리스트 단어·미리듣기 없음은 걸러낸다: $name',
      async ({ overrides }) => {
        expect(await resolveWith(overrides)).toBeNull();
      },
    );
  });
});
