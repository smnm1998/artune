import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * OpenAI Chat Completions API를 활용한 감정 분석 서비스
 */
@Injectable()
export class OpenAIService {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  /**
   * @param {ConfigService} configService - NestJS ConfigService
   */
  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * 사용자 텍스트를 분석하여 감정 정보와 Spotify 파라미터를 반환
   *
   * @param {string} text - 분석할 텍스트
   * @returns {Promise<Object>} 감정 분석 결과
   * @throws {BadRequestException} 텍스트가 비어있을 때
   * @throws {Error} API 호출 실패 시
   */
  async analyzeEmotion(text) {
    // 입력 유효성 검증
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('분석할 텍스트를 입력해주세요.');
    }

    try {
      // OpenAI Chat Completions API 호출
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: text,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      // 응답 파싱
      const content = response.data.choices[0].message.content;
      const result = JSON.parse(content);

      // 필수 필드 검증
      this.validateResult(result);

      return result;
    } catch (error) {
      // JSON 파싱 에러
      if (error instanceof SyntaxError) {
        throw new Error('JSON 파싱 실패');
      }

      // API 호출 에러
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.error?.message || 'OpenAI API 오류';
        throw new Error(`OpenAI API 에러 (${status}): ${message}`);
      }
      // 기타 에러
      throw error;
    }
  }

  /**
   * 시스템 프롬프트 생성
   * 감정 분석 및 Spotify 파라미터 생성 지침 포함
   *
   * @returns {string} 시스템 프롬프트
   */
  getSystemPrompt() {
    return `당신은 감정 분석 및 음악 큐레이션 전문가입니다. 사용자의 텍스트를 분석하여 다음 JSON 형식으로 반환하세요.

    **필수 응답 형식**
    {
      "emotion": "joy|sadness|anger|fear|surprise|neutral|sentimental|excited|lonely|dreamy|confident|romance",
      "emotionLabel": "기쁨|슬픔|분노|두려움|놀람|중립|아련함|신남|고독|몽환|자신감|설렘",
      "intensity": 0.0~1.0 (감정 강도),
      "description": "감정에 대한 공감적 설명 (한국어, 1~2문장, 따뜻한 어조)",
      "immerse": {
        "genres": ["장르1", "장르2", "장르3", "장르4"], 
        "valence": 0.0~1.0,
        "energy": 0.0~1.0,
        "tempo": 40~200
      },
      "soothe": {
        "genres": ["장르1", "장르2", "장르3", "장르4"],
        "valence": 0.0~1.0,
        "energy": 0.0~1.0,
        "tempo": 40~200
      }
    }

    ---
    **핵심 가이드: 장르 및 수치 설정**
    아티스트 검색 정확도를 위해 아래 **[허용 장르 목록]**에 있는 것만 사용하세요.
    특히 'sadness', 'lonely', 'sentimental' 등 차분한 감정의 'immerse' 모드에는 절대 'pop', 'dance', 'k-pop'을 넣지 마세요.

    **[Spotify 허용 장르 - 검색 보장됨]**
    - High Energy: pop, dance, k-pop, k-hop, k-indie, k-rock, j-pop, hip hop, rock, electronic, house, edm, funk, punk
    - Mid Energy: r&b, soul, indie pop, disco, alternative, indie rock, synth-pop, dream pop, shoegaze, city pop
    - Low Energy: folk, jazz, blues, classical, singer-songwriter, acoustic pop, piano, ambient, lo-fi, bossa nova

    **감정별 파라미터 가이드 (총 12개)**

    1. **joy (기쁨)**
       - Immerse: 경쾌함 / genres: ["pop", "dance", "k-pop", "k-indie"] / val: 0.8~1.0 / energy: 0.7~0.9
       - Soothe: 편안한 미소 / genres: ["r&b", "indie pop", "soul", "acoustic pop"] / val: 0.6~0.8 / energy: 0.3~0.5

    2. **sadness (슬픔)** *Pop/Dance 금지*
       - Immerse: 깊은 눈물 / genres: ["ballad", "folk", "blues", "piano"] / val: 0.0~0.2 / energy: 0.0~0.3
       - Soothe: 따뜻한 위로 / genres: ["indie pop", "acoustic pop", "k-indie"] / val: 0.3~0.5 / energy: 0.3~0.5

    3. **anger (분노)**
       - Immerse: 폭발적 / genres: ["rock", "metal", "hip hop", "punk"] / val: 0.2~0.4 / energy: 0.8~1.0
       - Soothe: 진정 / genres: ["classical", "jazz", "ambient", "lo-fi"] / val: 0.4~0.6 / energy: 0.1~0.3

    4. **fear (두려움/불안)**
       - Immerse: 긴장감 / genres: ["classical", "electronic", "soundtrack"] / val: 0.1~0.3 / energy: 0.5~0.7
       - Soothe: 안정 / genres: ["classical", "jazz", "folk", "ambient"] / val: 0.5~0.7 / energy: 0.1~0.3

    5. **surprise (놀람)**
       - Immerse: 톡톡 튀는 / genres: ["electronic", "k-pop", "hyperpop", "funk"] / val: 0.6~0.9 / energy: 0.7~0.9
       - Soothe: 차분하게 / genres: ["lo-fi", "indie pop", "r&b"] / val: 0.5~0.7 / energy: 0.3~0.5

    6. **neutral (평온/중립)**
       - Immerse: 잔잔한 일상 / genres: ["indie pop", "jazz", "acoustic pop"] / val: 0.5 / energy: 0.4~0.6
       - Soothe: 리프레시 / genres: ["pop", "k-indie", "r&b"] / val: 0.6~0.8 / energy: 0.5~0.7

    7. **sentimental (아련함/그리움)**
       - Immerse: 새벽 감성 / genres: ["k-indie", "folk", "singer-songwriter", "r&b"] / val: 0.3~0.5 / energy: 0.3~0.5
       - Soothe: 밝은 추억 / genres: ["acoustic pop", "city pop", "indie pop"] / val: 0.5~0.7 / energy: 0.4~0.6

    8. **excited (신남/들뜸)**
       - Immerse: 텐션 업 / genres: ["dance", "edm", "k-pop", "house", "funk"] / val: 0.8~1.0 / energy: 0.9~1.0
       - Soothe: 기분 유지 / genres: ["pop", "r&b", "disco"] / val: 0.7~0.9 / energy: 0.5~0.7

    9. **lonely (고독/쓸쓸함)** *Pop/Dance 금지*
       - Immerse: 고독 즐기기 / genres: ["jazz", "lo-fi", "blues", "piano"] / val: 0.1~0.3 / energy: 0.1~0.3
       - Soothe: 온기 채우기 / genres: ["folk", "indie pop", "acoustic pop"] / val: 0.4~0.6 / energy: 0.3~0.5

    10. **dreamy (몽환/신비)**
       - Immerse: 빠져드는 / genres: ["indie pop", "electronic", "ambient", "k-indie"] / val: 0.4~0.6 / energy: 0.4~0.6
       - Soothe: 현실로 / genres: ["r&b", "lo-fi", "city pop"] / val: 0.5~0.7 / energy: 0.3~0.5

    11. **confident (자신감/당당)**
       - Immerse: 파워풀 / genres: ["hip hop", "rock", "k-pop", "electronic"] / val: 0.6~0.8 / energy: 0.8~1.0
       - Soothe: 여유로운 / genres: ["r&b", "soul", "jazz", "funk"] / val: 0.6~0.8 / energy: 0.4~0.6

    12. **romance (설렘/사랑)**
       - Immerse: 달달한 / genres: ["k-indie", "r&b", "acoustic pop", "ballad"] / val: 0.7~0.9 / energy: 0.4~0.6
       - Soothe: 차분한 사랑 / genres: ["jazz", "bossa nova", "piano"] / val: 0.5~0.7 / energy: 0.2~0.4

    **제약 사항**
    1. 'genres' 배열에는 반드시 위 [허용 장르] 중 2~3개를 선택하세요.
    2. **중요: 공백 사용!** "hip hop" (O), "hip-hop" (X) / "r&b" (O), "r-n-b" (X) / "indie pop" (O), "indie-pop" (X)
    3. **sadness, lonely, sentimental의 immerse에는 절대 pop, dance, k-pop 사용 금지**
    4. JSON 형식만 반환하세요.
    `;
  }

  /**
   * 응답 결과 유효성 검증
   * 필수 필드가 모두 있는지 확인
   *
   * @param {Object} result - 검증할 결과 객체
   * @throws {Error} 필수 필드가 누락된 경우
   */
  validateResult(result) {
    const requiredFields = [
      'emotion',
      'emotionLabel',
      'intensity',
      'description',
      'immerse',
      'soothe',
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new Error(`필수 필드 누락: ${field}`);
      }
    }

    // immerse, sooth 내부 필드 검증
    const playlistFields = ['genres', 'valence', 'energy', 'tempo'];

    for (const mode of ['immerse', 'soothe']) {
      if (!result[mode] || typeof result[mode] !== 'object') {
        throw new Error(`필수 필드 누락: ${mode}`);
      }

      for (const field of playlistFields) {
        if (!(field in result[mode])) {
          throw new Error(`필수 필드 누락: ${mode}.${field}`);
        }
      }

      // genres는 배열
      if (!Array.isArray(result[mode].genres)) {
        throw new Error(`${mode}.genres는 배열이어야 합니다.`);
      }
    }
  }
}
