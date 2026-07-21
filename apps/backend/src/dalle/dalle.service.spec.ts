import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DalleService } from './dalle.service';

describe('DalleService', () => {
  let service: DalleService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DalleService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => 'test-api-key'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(DalleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDessertImage', () => {
    it('감정에 매핑된 정적 이미지와 프롬프트를 반환해야 한다.', async () => {
      // When
      const result = await service.generateDessertImage('joy', '기쁨', [
        'pop',
        'dance',
      ]);

      // Then — API 호출 없이 정적 매핑 사용 (비용 절약 정책)
      expect(result.imageUrl).toBe('/artwork/joy.png');
      expect(result.prompt).toContain('pixel art');
      expect(result.prompt).toContain('기쁨');
      expect(result.prompt).toContain('pop, dance');
    });

    it('매핑에 없는 감정은 플레이스홀더 이미지를 반환해야 한다.', async () => {
      const result = await service.generateDessertImage(
        'unknown',
        '알수없음',
        ['pop'],
      );

      expect(result.imageUrl).toContain('placeholder');
    });

    it('빈 감정이 입력되면 에러를 던져야 한다.', async () => {
      await expect(
        service.generateDessertImage('', '기쁨', ['pop']),
      ).rejects.toThrow('감정 정보가 필요합니다.');
    });

    it('빈 감정 라벨이 입력되면 에러를 던져야 한다.', async () => {
      await expect(
        service.generateDessertImage('joy', '', ['pop']),
      ).rejects.toThrow('감정 라벨이 필요합니다.');
    });

    it('빈 장르 배열이 입력되면 에러를 던져야 한다.', async () => {
      await expect(
        service.generateDessertImage('joy', '기쁨', []),
      ).rejects.toThrow('장르 정보가 필요합니다.');
    });

    it('감정별 스타일이 프롬프트에 반영되어야 한다.', async () => {
      // 기쁨 → bright/colorful/sweet 계열
      const joyResult = await service.generateDessertImage('joy', '기쁨', [
        'pop',
      ]);
      expect(joyResult.prompt).toMatch(/bright|colorful|sweet/i);

      // 슬픔 → warm/comfort/soft 계열
      const sadResult = await service.generateDessertImage(
        'sadness',
        '슬픔',
        ['ballad'],
      );
      expect(sadResult.prompt).toMatch(/warm|comfort|soft/i);

      // 스타일 미정의 감정 → 기본 스타일
      const dreamyResult = await service.generateDessertImage(
        'dreamy',
        '몽환',
        ['ambient'],
      );
      expect(dreamyResult.prompt).toMatch(/delightful and appealing/i);
    });
  });
});
