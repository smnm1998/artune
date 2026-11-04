import { Emotion } from './emotions.constant';

/**
 * 감정별 Immerse/Soothe 모드 설명
 *
 * EmotionService에서 사용하는 감정 설명 텍스트를 중앙 관리합니다.
 * 키가 감정 enum이라 12개 중 하나라도 빠지면 컴파일 오류가 납니다.
 */

/**
 * Immerse 모드 설명 (감정 심취)
 * 현재 감정을 더 깊이 느끼고 몰입하도록 유도
 */
export const IMMERSE_DESCRIPTIONS: Record<Emotion, string> = {
  joy: '이 기쁨을 더 깊이 느껴보세요',
  sadness: '이 슬픔에 깊이 공감해보세요',
  anger: '이 감정을 충분히 표현해보세요',
  fear: '지금 느끼는 불안을 인정해보세요',
  surprise: '이 짜릿한 순간을 생생하게 느껴보세요',
  neutral: '이 평온함을 더 깊이 만끽해보세요',
  sentimental: '그리운 추억에 잠겨보세요',
  excited: '이 에너지를 마음껏 발산하세요',
  lonely: '혼자만의 시간을 깊이 가져보세요',
  dreamy: '상상의 나래를 펼쳐보세요',
  confident: '당당한 기분을 만끽하세요',
  romance: '두근거리는 마음을 느껴보세요',
};

/**
 * Soothe 모드 설명 (감정 완화)
 * 현재 감정을 부드럽게 완화하고 진정시키도록 유도
 */
export const SOOTHE_DESCRIPTIONS: Record<Emotion, string> = {
  joy: '차분히 마음을 정리해보세요',
  sadness: '천천히 마음을 위로해보세요',
  anger: '조금씩 마음을 진정시켜보세요',
  fear: '차근차근 안정을 찾아보세요',
  surprise: '한숨 돌리고 천천히 가라앉혀보세요',
  neutral: '이 평온함을 유지해보세요',
  sentimental: '현재의 따뜻함으로 채워보세요',
  excited: '잠시 숨을 고르고 쉬어가세요',
  lonely: '따뜻한 목소리로 채워보세요',
  dreamy: '현실의 감각을 깨워보세요',
  confident: '여유로운 마음을 가져보세요',
  romance: '차분하게 마음을 가라앉혀보세요',
};
