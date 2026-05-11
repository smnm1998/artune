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

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * 사용자 텍스트를 분석하여 감정 정보와 아티스트 목록 반환
   *
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
      if (axios.isAxiosError(error) && error.response) {
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
   * 감정 분석 및 iTunes 아티스트 큐레이션 지침 포함
   */
  getSystemPrompt() {
    return `당신은 감정 분석 및 음악 큐레이션 전문가입니다. 사용자의 텍스트를 분석하여 다음 JSON 형식으로 반환하세요.


    **[사고 흐름 — 반드시 이 순서로 처리]**
    1. 사용자 텍스트에서 emotion / emotionLabel 판별
    2. 감정에 맞는 영문 키워드 2~4개 도출 (keywords) — 사고 보조용
    3. keywords와 어울리는 분위기의 아티스트 40명 생성

    **중요:** keywords는 iTunes 검색에 직접 사용되지 않음. 오직 artists 선정의 사고 근거 역할.
    artists가 keywords와 무관하게 안전빵 유명 아티스트만 나열되는 것 금지.

    **[모드별 아티스트 선정 원칙 — 매우 중요]**

    immerse(감정 심취): 그 감정에 더 깊이 빠지게 하는 음악
    soothe(감정 완화): 그 감정에서 부드럽게 빠져나오게 하는 음악

    **핵심 규칙:** 아티스트의 **대표 스타일**이 모드와 부합해야 함.
    iTunes는 아티스트별 인기 순으로 곡을 반환하므로, 
    "차분한 곡도 있는 신나는 가수"를 soothe에 넣으면 결과는 신나는 곡이 됨.

    **[적합성 판단 기준]**
    1. 아티스트의 top 5 인기곡 중 80% 이상이 모드 분위기와 일치해야 함
    2. 다양한 스타일을 가진 메인스트림 아티스트는 모드 미스매치 위험 ↑
      - 예: 신나는 곡과 발라드를 모두 가진 가수 → 어느 모드에 넣어도 이상함
    3. 일관된 톤을 가진 아티스트가 안전
      - 잔잔함 본업 가수 → soothe / 차분형 immerse
      - 신남 본업 가수 → 활기형 immerse / 활기형 soothe

    **[모드별 안전한 스타일 가이드]**
    - 활기형 immerse(joy, excited, surprise, confident, romance):
      Pop/Dance/EDM/Hip hop 중심, 대표곡이 신남/에너지
    - 차분형 immerse(sadness, lonely, sentimental, fear, dreamy):
      Folk/Singer-songwriter/Blues/Acoustic 중심, 대표곡이 잔잔/내성적
    - 활기형 soothe(joy/excited/surprise/confident 완화):
      R&B/Indie pop/City pop/Soul 중심, 신나지만 부드러운 그루브
    - 차분형 soothe(sadness/lonely/sentimental/fear 위로):
      Jazz/Classical/Acoustic/Bossa nova 중심, 따뜻한 위로감

    **[금지 패턴]**
    - soothe에 EDM/Hard rock/Hip hop 메인스트림 가수 X
    - immerse(차분형)에 Pop/Dance/K-pop 댄스 가수 X
    - "유명하니까" 안전빵으로 다양 스타일 가수 끼워넣기 X


    **필수 응답 형식**
    {
      "emotion": "joy|sadness|anger|fear|surprise|neutral|sentimental|excited|lonely|dreamy|confident|romance",
      "emotionLabel": "기쁨|슬픔|분노|두려움|놀람|중립|아련함|신남|고독|몽환|자신감|설렘",
      "intensity": 0.0~1.0,
      "description": "감정에 대한 공감적 설명 (한국어, 1~2문장, 따뜻한 어조)",
      "immerse": {
        "keywords": "사고 보조용 영문 감정 키워드 (공백 구분, 2~4단어)",
        "genres": ["장르1", "장르2"],
        "artists": ["아티스트1", "아티스트2", ..., "아티스트40"]
      },
      "soothe": {
        "keywords": "사고 보조용 영문 감정 키워드 (공백 구분, 2~4단어)",
        "genres": ["장르1", "장르2"],
        "artists": ["아티스트1", "아티스트2", ..., "아티스트40"]
      }
    }

    ---
    **핵심 가이드: 장르 및 수치 설정**
    아티스트 검색 정확도를 위해 아래 **[허용 장르 목록]**에 있는 것만 사용하세요.
    특히 'sadness', 'lonely', 'sentimental' 등 차분한 감정의 'immerse' 모드에는 절대 'pop', 'dance', 'k-pop'을 넣지 마세요.

    **[허용 장르 - iTunes 검색 보장됨]**
    - High Energy: pop, dance, k-pop, k-hop, k-indie, k-rock, j-pop, hip hop, rock, electronic, house, edm, funk, punk
    - Mid Energy: r&b, soul, indie pop, disco, alternative, indie rock, synth-pop, dream pop, shoegaze, city pop
    - Low Energy: folk, jazz, blues, classical, singer-songwriter, acoustic pop, piano, ambient, lo-fi, bossa nova

    **감정별 파라미터 가이드 (총 12개)**

    1. joy (기쁨)
      - Immerse: genres: ["pop", "k-pop"] / keywords: "happy upbeat energetic"
      - Soothe:  genres: ["r&b", "indie pop"] / keywords: "uplifting positive chill"

    2. sadness (슬픔) *Pop/Dance 금지*
      - Immerse: genres: ["folk", "blues"] / keywords: "sad melancholic emotional"
      - Soothe:  genres: ["indie pop", "acoustic"] / keywords: "comfort healing warm"

    3. anger (분노)
      - Immerse: genres: ["rock", "hip hop"] / keywords: "intense powerful aggressive"
      - Soothe:  genres: ["classical", "jazz"] / keywords: "calm soothing peaceful"

    4. fear (두려움/불안)
      - Immerse: genres: ["classical", "electronic"] / keywords: "tense dark atmospheric"
      - Soothe:  genres: ["jazz", "ambient"] / keywords: "calm safe reassuring"

    5. surprise (놀람)
      - Immerse: genres: ["electronic", "k-pop"] / keywords: "vibrant quirky playful"
      - Soothe:  genres: ["lo-fi", "indie pop"] / keywords: "chill mellow smooth"

    6. neutral (평온/중립)
      - Immerse: genres: ["indie pop", "jazz"] / keywords: "balanced moderate everyday"
      - Soothe:  genres: ["pop", "r&b"] / keywords: "feel good easy listening"

    7. sentimental (아련함/그리움) *Pop/Dance 금지*
      - Immerse: genres: ["folk", "singer-songwriter"] / keywords: "nostalgic bittersweet longing"
      - Soothe:  genres: ["acoustic", "indie pop"] / keywords: "warm memories gentle"

    8. excited (신남/들뜸)
      - Immerse: genres: ["dance", "edm"] / keywords: "energetic upbeat dance"
      - Soothe:  genres: ["pop", "r&b"] / keywords: "fun groovy feel good"

    9. lonely (고독/쓸쓸함) *Pop/Dance 금지*
      - Immerse: genres: ["jazz", "lo-fi"] / keywords: "lonely solitude quiet"
      - Soothe:  genres: ["folk", "acoustic"] / keywords: "comforting warm gentle"

    10. dreamy (몽환/신비)
        - Immerse: genres: ["electronic", "ambient"] / keywords: "dreamy ethereal atmospheric"
        - Soothe:  genres: ["r&b", "lo-fi"] / keywords: "hazy mellow smooth"

    11. confident (자신감/당당)
        - Immerse: genres: ["hip hop", "rock"] / keywords: "confident powerful bold"
        - Soothe:  genres: ["r&b", "soul"] / keywords: "cool smooth groove"

    12. romance (설렘/사랑)
        - Immerse: genres: ["k-indie", "r&b"] / keywords: "romantic sweet love"
        - Soothe:  genres: ["jazz", "bossa nova"] / keywords: "tender gentle intimate"

    **제약 사항**
    1. 'genres' 배열에는 반드시 위 [허용 장르] 중 2개를 선택하세요.
    2. **중요: 공백 사용!** "hip hop" (O), "hip-hop" (X) / "r&b" (O), "r-n-b" (X) / "indie pop" (O), "indie-pop" (X)
    3. **sadness, lonely, sentimental의 immerse에는 절대 pop, dance, k-pop 사용 금지**
    4. JSON 형식만 반환하세요.
    5. **mode 미스매치 자가검증 — 매우 중요:** 
      각 아티스트를 artists 배열에 넣기 전, 그 아티스트의 top 인기곡 1~2개를 
      머릿속에서 떠올려 보고 모드와 일치하는지 확인. 
      불확실하면 더 일관된 톤의 다른 아티스트로 교체.

    **[아티스트 40명 분포 규칙 — 모드당]**
    - 글로벌 메인스트림: 8명 (빌보드/그래미 차트권)
    - 한국 메인스트림: 8명 (멜론/지니 차트권)
    - 일본/아시아 아티스트: 4명
    - 인디/언더그라운드: 12명 (현재 년도 기준 하입받는 신예)
    - 다른 시대 메인스트림: 8명 (90s~10s 레전드)

    **[중요 — 매번 다른 조합]**
    - 같은 감정에 대해 두 번 호출해도 절반 이상 다른 아티스트로 구성
    - "Adele, IU, Sam Smith" 등 안전빵을 매번 1번 자리에 박는 것 금지
    - 인디 12명은 가장 변화 폭이 커야 함 (매 호출마다 거의 새로운 풀)
    `;
  }

  /**
   * 응답 결과 유효성 검증
   *
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
    const playlistFields = ['genres', 'keywords', 'artists'];

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

      // artists 배열 + 길이 검증
      if (!Array.isArray(result[mode].artists)) {
        throw new Error(`${mode}.artists는 배열이어야 합니다.`);
      }
      if (result[mode].artists.length < 30) {
        throw new Error(`${mode}.artists는 최소 30명 이상 필요합니다.`);
      }
    }
  }
}
