import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EMOTION_LABELS } from '../emotion/constants/emotions.constant';
import {
  EMOTION_ANALYSIS_FORMAT,
  EmotionAnalysis,
  EmotionAnalysisOutput,
} from './emotion-analysis.schema';
import {
  buildPickFormat,
  buildPickPrompt,
  PICK_VARIANTS,
  PickOutput,
  PickResult,
  PRODUCTION_PICK_VARIANT,
} from './pick-prompt';

/**
 * OpenAI Chat Completions API를 활용한 감정 분석 서비스
 */
@Injectable()
export class OpenAIService {
  // gpt-4.1-mini는 2027-01-14 종료. 추론은 끈다(none) — 프로브(11/2·11/3)가 이 설정으로 측정됨
  static readonly MODEL = 'gpt-6-luna';
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.getOrThrow('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * 사용자 글 → 감정·위기 신호·공감 문구 + 모드별 곡 (LLM 직접 선곡, R2). 변형은 PRODUCTION_PICK_VARIANT
   *
   * @throws {BadRequestException} 텍스트가 비어있을 때
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림·모드 곡이 3곡 미만일 때
   */
  async pickSongs(text: string): Promise<PickResult> {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('분석할 텍스트를 입력해주세요.');
    }
    const options = PICK_VARIANTS[PRODUCTION_PICK_VARIANT];
    const result = await this.complete<PickOutput>(
      buildPickPrompt(options),
      buildPickFormat(options),
      text,
    );
    // 곡 수는 스키마가 아니라 프롬프트로 지시한다 — 측정에서 지시 준수 98~99%(11/6)
    for (const mode of ['immerse', 'soothe'] as const) {
      if (result[mode].length < 3) {
        throw new Error(`${mode} 곡이 3곡 미만입니다.`);
      }
    }
    return { ...result, emotionLabel: EMOTION_LABELS[result.emotion] };
  }

  /**
   * 사용자 텍스트를 분석하여 감정 정보와 모드별 시드곡 반환 (Last.fm 경로 — R4에서 삭제)
   *
   * @throws {BadRequestException} 텍스트가 비어있을 때
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림 시
   */
  async analyzeEmotion(text): Promise<EmotionAnalysis> {
    // 입력 유효성 검증
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('분석할 텍스트를 입력해주세요.');
    }
    const result = await this.complete<EmotionAnalysisOutput>(
      this.getSystemPrompt(),
      EMOTION_ANALYSIS_FORMAT,
      text,
    );
    this.validateResult(result);
    return { ...result, emotionLabel: EMOTION_LABELS[result.emotion] };
  }

  /**
   * Chat Completions 1회 — Structured Outputs(json_schema strict) 응답을 파싱해 돌려준다
   *
   * @throws {Error} API 호출 실패·응답 거절·토큰 한도 잘림·JSON 파싱 실패 시
   */
  private async complete<T>(
    systemPrompt: string,
    responseFormat: object,
    text: string,
  ): Promise<T> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: OpenAIService.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          response_format: responseFormat,
          reasoning_effort: 'none',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      // strict 스키마는 형태를 보장하지만, 거절·토큰 한도 잘림은 스키마 밖 결과로 온다
      const choice = response.data.choices[0];
      if (choice.message.refusal) {
        throw new Error(`OpenAI 응답 거절: ${choice.message.refusal}`);
      }
      if (choice.finish_reason === 'length') {
        throw new Error('OpenAI 응답이 토큰 한도에서 잘렸습니다.');
      }
      return JSON.parse(choice.message.content) as T;
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
    1. 사용자 텍스트에서 emotion 판별, 위기 신호(crisis) 확인
    2. 감정에 맞는 영문 키워드 2~4개 도출 (keywords) — 사고 보조용
    3. keywords·모드와 어울리는 **시드곡(seed track)**을 지역별로 선정
       (한국 3곡 / 팝 2곡 / 일본 1곡, 모드당)

    **중요: 시드는 "곡 추천의 씨앗"임.** 이 시드곡과 비슷한 곡들을 시스템이
    협업필터링(Last.fm)으로 확장하므로, 시드는 다음 조건을 반드시 만족해야 함:
    - **어느 정도 알려진 곡** (Last.fm 청취 데이터가 있어야 유사곡이 나옴).
      너무 마이너한 인디/신예 곡은 유사곡이 0개로 나와 실패함.
    - 아티스트가 아니라 **그 곡 자체의 무드**가 모드와 맞아야 함
      (분노 immerse에 록밴드를 넣어도 그들의 발라드가 아닌 격한 대표곡).
    - 시드의 **지역**이 확장 결과의 지역을 결정함
      (한국 곡을 넣으면 한국 곡들이, 일본 곡을 넣으면 일본 곡들이 확장됨).

    **[모드별 곡 선정 원칙 — 매우 중요]**

    immerse(감정 심취): 그 감정에 더 깊이 빠지게 하는 곡
    soothe(감정 완화): 그 감정에서 부드럽게 빠져나오게 하는 곡

    **핵심 규칙:** 지정하는 **곡 자체의 분위기**가 모드와 부합해야 함.
    아티스트의 대표 스타일이 아니라, 그 아티스트가 낸 **바로 그 곡**의 무드로 판단.
    다양한 스타일의 아티스트라도 모드에 맞는 특정 곡을 골라내면 됨.

    **모드 분리 규칙 — 매우 중요:** immerse 곡들과 soothe 곡들이 한 플레이리스트에
    섞여도 어색하지 않다면 잘못된 선정. 두 목록은 장르·질감·에너지 축에서
    듣는 순간 구분될 만큼 명확히 달라야 함.

    **[모드별 안전한 스타일 가이드]**
    - 활기형 immerse(joy, excited, surprise, confident, romance):
      Pop/Dance/EDM/Hip hop 중심, 신남/에너지 있는 곡
    - 차분형 immerse(sadness, lonely, sentimental, fear, dreamy):
      Folk/Singer-songwriter/Blues/Acoustic 중심, 잔잔/내성적인 곡
    - 활기형 soothe(joy/excited/surprise/confident 완화):
      R&B/Indie pop/City pop/Soul 중심, 신나지만 부드러운 그루브의 곡
    - 차분형 soothe(sadness/lonely/sentimental/fear 위로):
      Jazz/Classical/Acoustic/Bossa nova 중심, 따뜻한 위로감의 곡

    **[금지 패턴]**
    - soothe에 격한 EDM/Hard rock/Hip hop 곡 X
    - immerse(차분형)에 신나는 Pop/Dance/K-pop 댄스 곡 X
    - 실재하지 않는 곡·아티스트 창작 X (반드시 실제로 발매된 곡만)

    **[위기 신호 — crisis]**
    - 스스로를 해치거나 삶을 끝내고 싶다는 뜻(자해·자살 생각이나 계획, "사라지고 싶다", "다 끝내고 싶다")이 직접 드러나거나 분명히 읽히면 true
    - "배고파 죽겠다", "웃겨 죽겠네"처럼 정도를 강조하는 관용 표현, 슬픔·지침만 있는 글은 false
    - 어느 쪽인지 애매하면 true (안내가 한 번 더 보이는 비용이 놓치는 비용보다 작다)
    - true여도 감정 분석과 플레이리스트는 그대로 만든다. description은 판단하거나 훈계하지 말고 곁에 있어 주는 어조로

    **필수 응답 형식**
    {
      "emotion": "joy|sadness|anger|fear|surprise|neutral|sentimental|excited|lonely|dreamy|confident|romance",
      "crisis": true|false,
      "description": "감정에 대한 공감적 설명 (한국어, 1~2문장, 따뜻한 어조)",
      "immerse": {
        "keywords": "사고 보조용 영문 감정 키워드 (공백 구분, 2~4단어)",
        "genres": ["장르1", "장르2"],
        "seeds": {
          "korea": [{ "artist": "아티스트", "title": "곡" }, ... (3곡)],
          "pop":   [{ "artist": "아티스트", "title": "곡" }, ... (2곡)],
          "jpop":  [{ "artist": "アーティスト/artist", "title": "곡" }, ... (1곡)]
        }
      },
      "soothe": {
        "keywords": "...",
        "genres": ["장르1", "장르2"],
        "seeds": {
          "korea": [ ... (3곡)],
          "pop":   [ ... (2곡)],
          "jpop":  [ ... (1곡)]
        }
      }
    }

    **[시드 표기 규칙]**
    - artist/title: 실제 발매된 곡. 부제·버전(Remix, Live) 생략하고 원곡 제목만
    - korea: 한국 아티스트는 한글 표기 (예: "아이유", "박효신")
    - pop: 영미권 팝. 영문 표기 (예: "Dua Lipa")
    - jpop: 일본 곡. 영문 표기 권장 (예: "YOASOBI", "Kenshi Yonezu")
    - **각 시드는 서로 다른 아티스트로** (한 아티스트 반복 X)

    **[곡 표기 규칙 — iTunes 검색 정확도]**
    - artist: 해당 곡의 대표 표기 (영문 아티스트는 영문, 한국 아티스트는 한글)
    - title: 정확한 곡 제목. 부제/버전 표기(Remix, Live 등)는 생략하고 원곡 제목만
    - 실제로 iTunes/Apple Music에 존재하는 곡만. 불확실하면 더 확실한 다른 곡으로 대체

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
      - Soothe:  genres: ["jazz", "soul"] / keywords: "warm smooth positive"

    2. sadness (슬픔) *Pop/Dance 금지*
      - Immerse: genres: ["folk", "blues"] / keywords: "sad melancholic emotional"
      - Soothe:  genres: ["soul", "jazz"] / keywords: "comfort healing warm"

    3. anger (분노)
      - Immerse: genres: ["rock", "hip hop"] / keywords: "intense powerful aggressive"
      - Soothe:  genres: ["classical", "jazz"] / keywords: "calm soothing peaceful"

    4. fear (두려움/불안)
      - Immerse: genres: ["classical", "electronic"] / keywords: "tense dark atmospheric"
      - Soothe:  genres: ["jazz", "ambient"] / keywords: "calm safe reassuring"

    5. surprise (놀람)
      - Immerse: genres: ["electronic", "k-pop"] / keywords: "vibrant quirky playful"
      - Soothe:  genres: ["lo-fi", "soul"] / keywords: "chill mellow smooth"

    6. neutral (평온/중립)
      - Immerse: genres: ["indie pop", "jazz"] / keywords: "balanced moderate everyday"
      - Soothe:  genres: ["pop", "r&b"] / keywords: "feel good easy listening"

    7. sentimental (아련함/그리움) *Pop/Dance 금지*
      - Immerse: genres: ["folk", "singer-songwriter"] / keywords: "nostalgic bittersweet longing"
      - Soothe:  genres: ["bossa nova", "jazz"] / keywords: "warm memories gentle"

    8. excited (신남/들뜸)
      - Immerse: genres: ["dance", "edm"] / keywords: "energetic upbeat dance"
      - Soothe:  genres: ["soul", "jazz"] / keywords: "smooth groovy feel good"

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
    5. **시드 무드 자가검증 — 매우 중요:** 각 시드곡을 넣기 전,
      그 곡을 실제로 들었을 때의 분위기가 모드와 맞는지 확인.
      아티스트가 아니라 **그 곡 하나**의 무드로 판단할 것.

    **[시드 선정 규칙 — 모드당 총 6곡]**
    - 한국 3곡 + 팝 2곡 + 일본 1곡 (지역 태그가 곧 확장 결과의 지역)
    - 모두 서로 다른 아티스트
    - **적당히 유명한 곡** — Last.fm에 청취 기록이 있을 만한 곡
      (차트 진입했거나, 널리 알려진 명곡. 아무도 모르는 딥컷 금지)

    **[중요 — 매번 다른 조합]**
    - 같은 감정에 대해 두 번 호출해도 시드 절반 이상을 다른 곡으로
    - "아이유 - 좋은 날" 같은 안전빵을 매번 1번 자리에 박는 것 금지

    **[곡 30개 분포 규칙 — 모드당]**
    - 아티스트 다양성: **한 아티스트당 최대 2곡**, 서로 다른 아티스트 20명 이상
    - 글로벌 메인스트림 곡: 8곡
    - 한국 메인스트림 곡: 8곡
    - 일본/아시아 곡: 4곡
    - 인디/언더그라운드 곡: 6곡 (하입받는 신예)
    - 다른 시대 레전드 곡: 4곡 (90s~10s)

    **[중요 — 매번 다른 조합]**
    - 같은 감정에 대해 두 번 호출해도 절반 이상 다른 곡으로 구성
    - "Adele - Someone Like You" 등 안전빵을 매번 1번 자리에 박는 것 금지
    - 인디 곡은 가장 변화 폭이 커야 함 (매 호출마다 거의 새로운 풀)
    `;
  }

  /**
   * 스키마로 표현할 수 없는 조건만 검사한다 (형태는 json_schema strict가 보장)
   *
   * @throws {Error} 모드의 시드가 3곡 미만인 경우
   */
  validateResult(result: EmotionAnalysisOutput) {
    for (const mode of ['immerse', 'soothe'] as const) {
      const { korea, pop, jpop } = result[mode].seeds;
      if (korea.length + pop.length + jpop.length < 3) {
        throw new Error(`${mode}.seeds는 최소 3곡 이상 필요합니다.`);
      }
    }
  }
}
