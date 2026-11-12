import { Injectable } from '@nestjs/common';
import type { Artwork } from '@artune/shared-types';
import type { Emotion } from '../emotion/constants/emotions.constant';
import { ARTWORK_URLS } from './artwork.constant';

/** DALL·E 프롬프트에 넣는 감정별 디저트 분위기 — 없는 감정은 기본 문구 */
const DESSERT_STYLES: Partial<Record<Emotion, string>> = {
  joy: 'bright and colorful with sweet toppings',
  sadness: 'warm and comforting with soft textures',
  anger: 'bold and spicy with intense flavors',
  fear: 'mysterious and dark with surprising elements',
  surprise: 'vibrant and unexpected with unique decorations',
  neutral: 'balanced and harmonious with classic elements',
};

/**
 * 감정별 아트워크 — 지금은 미리 만든 정적 이미지를 돌려준다.
 * 요청마다 DALL·E로 그리던 것을 비용 때문에 멈췄다. 다시 켜면 getArtwork에서 createDessertPrompt로 그린다
 */
@Injectable()
export class DalleService {
  /** 감정별 정적 이미지 — 외부 호출 없음 */
  getArtwork(emotion: Emotion): Artwork {
    return { url: ARTWORK_URLS[emotion] };
  }

  /** DALL·E 프롬프트 — 지금은 부르는 곳이 없다 (재가동할 때 getArtwork에서 쓴다) */
  createDessertPrompt(emotion: Emotion, emotionLabel: string): string {
    const style = DESSERT_STYLES[emotion] ?? 'delightful and appealing';

    return `A minimalist pixel art illustration with EXACTLY ONE BEVERAGE (drink) and EXACTLY ONE DESSERT (cake, pastry, or sweet treat).
      MANDATORY: The image MUST contain both a drink and a dessert item, no exceptions.
      The dessert should be ${style}, representing the emotion of ${emotionLabel} (${emotion}).
      Simple, clean composition with ONLY these two items: one beverage + one dessert.
      NO other elements, NO additional decorations, NO background objects, NO extra items.
      Clean white or simple solid color background.
      Beautifully detailed pixel art style with vibrant colors.
      Remember: MUST include both drink AND dessert.`;
  }
}
