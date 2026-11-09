import { NOTICES } from '@/constants/notices';
import {
  wrapperStyle,
  attributionStyle,
  badgeLinkStyle,
  badgeImageStyle,
} from './PreviewSource.styles';

/**
 * Apple이 호스팅하는 공식 한국어 배지(Apple Marketing Tools 삽입 코드와 같은 주소, 139.6×40 SVG).
 * 원본을 그대로 쓴다 — 색·글자·회색 테두리를 고치지 않는다
 */
export const APPLE_MUSIC_BADGE_SRC =
  'https://toolbox.marketingtools.apple.com/api/badges/listen-on-apple-music/badge/ko-kr';

interface PreviewSourceProps {
  /** 이 곡의 Apple Music 주소 — 없으면(곡 링크를 보내지 않는 이전 서버) 배지를 뺀다 */
  url?: string;
}

/**
 * 미리듣기 출처 — 그 곡의 Apple Music 배지 링크, 그 아래 "provided courtesy of iTunes".
 * - iTunes Search API 약관: 미리듣기·커버는 스토어 배지 가까이, 미리듣기에는 출처 표기(문구는 약관 그대로)
 * - Apple Music 가이드라인: 한 화면에 배지는 하나 → 카드마다가 아니라 열린 곡(PC 호버 카드·모바일 모달)에만 둔다
 */
function PreviewSource({ url }: PreviewSourceProps) {
  return (
    <div css={wrapperStyle}>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          css={badgeLinkStyle}
        >
          <img
            src={APPLE_MUSIC_BADGE_SRC}
            alt="Apple Music에서 듣기"
            css={badgeImageStyle}
          />
        </a>
      )}
      <p css={attributionStyle}>{NOTICES.PREVIEW_ATTRIBUTION}</p>
    </div>
  );
}

export default PreviewSource;
