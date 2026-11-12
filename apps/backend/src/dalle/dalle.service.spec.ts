import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { DalleService } from './dalle.service';
import { EMOTIONS } from '../emotion/constants/emotions.constant';

describe('DalleService', () => {
  let service: DalleService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DalleService],
    }).compile();

    service = moduleRef.get(DalleService);
  });

  describe('getArtwork', () => {
    it('감정에 매핑된 정적 이미지 주소를 돌려준다 (외부 호출 없음)', () => {
      expect(service.getArtwork('joy')).toEqual({ url: '/artwork/joy.png' });
    });

    it('모든 감정의 이미지가 프론트 public/에 실제로 있다', () => {
      const publicDir = join(__dirname, '../../../frontend/public');
      const missing = EMOTIONS.filter(
        (emotion) =>
          !existsSync(join(publicDir, service.getArtwork(emotion).url)),
      );
      expect(missing).toEqual([]);
    });
  });

  describe('createDessertPrompt (재가동용)', () => {
    it('감정 라벨과 감정별 디저트 분위기가 들어간다', () => {
      const prompt = service.createDessertPrompt('joy', '기쁨');
      expect(prompt).toContain('pixel art');
      expect(prompt).toContain('기쁨 (joy)');
      expect(prompt).toContain('bright and colorful');
    });

    it('분위기가 없는 감정은 기본 문구를 쓴다', () => {
      expect(service.createDessertPrompt('dreamy', '몽환')).toContain(
        'delightful and appealing',
      );
    });
  });
});
