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
    it('곡명·아티스트가 일치하는 후보를 해석하고 캐시에 저장한다', async () => {
      const artistName = 'System of a Down';
      const target = makeTrack({
        trackId: 10,
        trackName: 'Toxicity',
        artistName,
      });
      const noise = makeTrack({
        trackId: 11,
        trackName: 'Different Song',
        artistName,
      });
      // 일치 후보가 배열 뒤에 있어도 골라내야 함
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

    it('US 스토어를 자유텍스트로 검색한다 (KR 스토어 검색은 결과가 0건이라 쓰지 않음)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [makeTrack({ trackName: 'Toxicity' })] },
      });

      await service.resolveTrack({ artist: 'SOAD', title: 'Toxicity' });

      // axios 1.21부터 params가 제네릭 타입이라 mock 호출 기록에선 unknown으로 추론된다
      const [, config] = mockedAxios.get.mock.calls[0];
      const params = config?.params as Record<string, unknown>;
      expect(params.term).toBe('SOAD Toxicity');
      expect(params.attribute).toBeUndefined();
      expect(params.country).toBe('us');
      expect(params.limit).toBe(ITunesService.SEARCH_LIMIT);
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
      // US 표기·KR 표기 모두 불일치 → null 확정 캐시
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'resolve:이센스:불꽃',
        null,
      );
    });

    it('곡명이 같아도 아티스트가 다르면(커버) 폐기한다', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          results: [
            makeTrack({
              trackName: 'American Idiot',
              artistName: 'Rockabye Baby!',
            }),
          ],
        },
      });

      const result = await service.resolveTrack({
        artist: 'Green Day',
        title: 'American Idiot',
      });

      expect(result).toBeNull();
      // 요청에 한글·일본어가 없으면 현지화 lookup을 하지 않는다
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('한글 요청은 US 표기로 실패하면 KR 스토어 표기로 대조한다', async () => {
      const us = makeTrack({
        trackId: 10,
        trackName: 'Good Day',
        artistName: 'IU',
      });
      const kr = makeTrack({
        trackId: 10,
        trackName: '좋은 날',
        artistName: '아이유',
      });
      mockedAxios.get
        .mockResolvedValueOnce({ data: { results: [us] } })
        .mockResolvedValueOnce({ data: { results: [kr] } });

      const result = await service.resolveTrack({
        artist: '아이유',
        title: '좋은 날',
      });

      expect(result).toEqual(us);
      const [url, config] = mockedAxios.get.mock.calls[1];
      expect(url).toBe(ITunesService.LOOKUP_URL);
      expect(config?.params).toEqual({ id: '10', country: 'kr' });
    });

    it('일본 곡이 US 스토어에 없으면 JP 스토어를 검색한다', async () => {
      const jp = makeTrack({ trackName: 'チェリー', artistName: 'スピッツ' });
      mockedAxios.get
        .mockResolvedValueOnce({ data: { results: [] } })
        .mockResolvedValueOnce({ data: { results: [jp] } });

      const result = await service.resolveTrack({
        artist: 'スピッツ',
        title: 'チェリー',
      });

      expect(result).toEqual(jp);
      const [, config] = mockedAxios.get.mock.calls[1];
      expect((config?.params as Record<string, unknown>).country).toBe('jp');
    });

    it('현지화 lookup이 throttle되면 캐시하지 않고 null', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { results: [makeTrack({ trackName: 'Good Day' })] },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 403 },
        });

      const result = await service.resolveTrack({
        artist: '아이유',
        title: '좋은 날',
      });

      expect(result).toBeNull();
      expect(cacheManager.set).not.toHaveBeenCalled();
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
      return service.resolveTrack({
        artist: track.artistName,
        title: track.trackName,
      });
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
      { name: 'tribute', overrides: { collectionName: 'Tribute to Queen' } },
      { name: 'sleep sounds', overrides: { collectionName: 'Sleep Sounds' } },
      { name: 'previewUrl 없음', overrides: { previewUrl: null } },
    ])(
      '블랙리스트 단어·미리듣기 없음은 걸러낸다: $name',
      async ({ overrides }) => {
        expect(await resolveWith(overrides)).toBeNull();
      },
    );

    it.each([
      { name: 'hits', overrides: { collectionName: 'Greatest Hits' } },
      { name: 'best of', overrides: { collectionName: 'The Best Of IU' } },
      {
        name: 'playlist',
        overrides: {
          collectionName: 'HOSPITAL PLAYLIST (Original Television Soundtrack)',
        },
      },
    ])(
      '모음집 앨범은 거르지 않는다 (다른 후보가 없으면 채택): $name',
      async ({ overrides }) => {
        expect(await resolveWith(overrides)).not.toBeNull();
      },
    );

    it('모음집 수록본보다 원 앨범 수록본을 고른다', async () => {
      const best = makeTrack({ trackId: 1, collectionName: 'The Best Of IU' });
      const album = makeTrack({ trackId: 2 });
      mockedAxios.get.mockResolvedValue({ data: { results: [best, album] } });

      const result = await service.resolveTrack({
        artist: album.artistName,
        title: album.trackName,
      });

      expect(result?.trackId).toBe(2);
    });
  });

  describe('localizeTracks', () => {
    const usGoodDay = makeTrack({
      trackId: 10,
      trackName: 'Good Day',
      artistName: 'IU',
    });
    const usDynamite = makeTrack({
      trackId: 20,
      trackName: 'Dynamite',
      artistName: 'BTS',
    });

    it('최종 곡을 KR 스토어 버전으로 한 번에 바꾼다', async () => {
      const krGoodDay = makeTrack({
        trackId: 10,
        trackName: '좋은 날',
        artistName: '아이유',
        trackViewUrl: 'https://music.apple.com/kr/...',
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { results: [krGoodDay] } });

      const result = await service.localizeTracks([usGoodDay, usDynamite]);

      // KR 스토어에 없는 곡(Dynamite 응답 누락)은 원래 트랙 유지
      expect(result).toEqual([krGoodDay, usDynamite]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe(ITunesService.LOOKUP_URL);
      expect(config?.params).toEqual({ id: '10,20', country: 'kr' });
    });

    it('KR 버전에 미리듣기가 없으면 원래 트랙을 쓴다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            makeTrack({ trackId: 10, trackName: '좋은 날', previewUrl: null }),
          ],
        },
      });

      expect(await service.localizeTracks([usGoodDay])).toEqual([usGoodDay]);
    });

    it('조회에 실패하면 원래 트랙을 그대로 반환한다', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 429 },
      });

      expect(await service.localizeTracks([usGoodDay])).toEqual([usGoodDay]);
    });

    it('빈 목록은 조회하지 않는다', async () => {
      expect(await service.localizeTracks([])).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
