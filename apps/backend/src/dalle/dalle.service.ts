import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DalleService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/images/generations';
  }

  /**
   * 감정과 장르 정보를 기반으로 디저트 이미지를 생성합니다.
   *
   * @param {string} emotion - 감정 키 (예: 'joy')
   * @param {string} emotionLabel - 감정 한글 라벨 (예: '기쁨')
   * @param {string[]} genres - 음악 장르 배열 (예: ['pop', 'dance'])
   * @returns {Promise<{imageUrl: string, prompt: string}>} 생성된 이미지 URL과 사용된 프롬프트
   */
  async generateDessertImage(emotion, emotionLabel, genres) {
    // 유효성 검사
    this.validateParameters(emotion, emotionLabel, genres);

    // 프롬프트 생성 (실제 생성은 안 하더라도 로그나 디버깅용으로 남겨둠)
    const prompt = this.createDessertPrompt(emotion, emotionLabel, genres);

    // DALL-E API 호출 대신 정적 이미지 매핑 사용
    // 이미지는 apps/frontend/public/artwork/ 폴더에 저장되어 있어야 합니다.
    const staticImages = {
      joy: '/artwork/joy.png',
      sadness: '/artwork/sadness.png',
      anger: '/artwork/anger.png',
      fear: '/artwork/fear.png',
      surprise: '/artwork/surprise.png',
      neutral: '/artwork/neutral.png',
      disgust: '/artwork/disgust.png',
      sentimental: '/artwork/sentimental.png',
      excited: '/artwork/excited.png',
      lonely: '/artwork/lonely.png',
      dreamy: '/artwork/dreamy.png',
      confident: '/artwork/confident.png',
      romance: '/artwork/romance.png',
    };

    // 해당 감정의 이미지가 없으면 플레이스홀더 이미지 반환
    const imageUrl =
      staticImages[emotion] ||
      'https://via.placeholder.com/1024x1024?text=Default+Artwork';

    // API 호출 비용 절약을 위해 바로 리턴
    return {
      imageUrl: imageUrl,
      prompt: prompt,
    };

    // try {
    //   // DALL-E API
    //   const response = await axios.post(
    //     this.apiUrl,
    //     {
    //       model: 'dall-e-2',
    //       prompt: prompt,
    //       n: 1,
    //       size: '1024x1024',
    //     },
    //     {
    //       headers: {
    //         Authorization: `Bearer ${this.apiKey}`,
    //         'Content-Type': 'application/json',
    //       },
    //     },
    //   );

    //   return {
    //     imageUrl: response.data.data[0].url,
    //     prompt: prompt,
    //   };
    // } catch (error) {
    //   throw new Error(`DALL-E 이미지 생성 실패: ${error.message}`);
    // }
  }

  /**
   * 입력 파라미터 유효성을 검사합니다.
   *
   * @param {string} emotion - 감정 키
   * @param {string} emotionLabel - 감정 라벨
   * @param {string[]} genres - 장르 배열
   * @throws {BadRequestException} 유효하지 않은 파라미터가 있을 경우
   */
  validateParameters(emotion, emotionLabel, genres) {
    if (!emotion || emotion.trim() === '') {
      throw new BadRequestException('감정 정보가 필요합니다.');
    }

    if (!emotionLabel || emotionLabel.trim() === '') {
      throw new BadRequestException('감정 라벨이 필요합니다.');
    }

    if (!genres || !Array.isArray(genres) || genres.length === 0) {
      throw new BadRequestException('장르 정보가 필요합니다.');
    }
  }

  /**
   * 감정과 장르를 기반으로 DALL-E 프롬프트를 생성합니다.
   *
   * @param {string} emotion - 감정 키
   * @param {string} emotionLabel - 감정 한글 라벨
   * @param {string[]} genres - 장르 배열
   * @returns {string} 생성된 프롬프트
   */
  createDessertPrompt(emotion, emotionLabel, genres) {
    // 감정별 디저트 스타일 매핑
    const emotionStyles = {
      joy: 'bright and colorful with sweet toppings',
      sadness: 'warm and comforting with soft textures',
      anger: 'bold and spicy with intense flavors',
      fear: 'mysterious and dark with surprising elements',
      surprise: 'vibrant and unexpected with unique decorations',
      disgust: 'unusual and exotic with rare ingredients',
      neutral: 'balanced and harmonious with classic elements',
    };

    const style = emotionStyles[emotion] || 'delightful and appealing';

    // 장르 정보를 프롬프트에 통합
    const genreText = genres.join(', ');

    return `A minimalist pixel art illustration with EXACTLY ONE BEVERAGE (drink) and EXACTLY ONE DESSERT (cake, pastry, or sweet treat).
      MANDATORY: The image MUST contain both a drink and a dessert item, no exceptions.
      The dessert should be ${style}, inspired by ${genreText} music genres, representing the emotion of ${emotionLabel} (${emotion}).
      Simple, clean composition with ONLY these two items: one beverage + one dessert.
      NO other elements, NO additional decorations, NO background objects, NO extra items.
      Clean white or simple solid color background.
      Beautifully detailed pixel art style with vibrant colors.
      Remember: MUST include both drink AND dessert.`;
  }
}
