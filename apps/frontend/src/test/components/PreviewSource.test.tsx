import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewSource, {
  APPLE_MUSIC_BADGE_SRC,
} from '@/components/PreviewSource/PreviewSource';
import { NOTICES } from '@/constants/notices';

const URL = 'https://music.apple.com/kr/album/x/1?i=2';

describe('PreviewSource', () => {
  it('Apple 배지가 그 곡의 Apple Music 주소를 새 탭으로 연다', () => {
    render(<PreviewSource url={URL} />);

    const link = screen.getByRole('link', { name: 'Apple Music에서 듣기' });
    expect(link.getAttribute('href')).toBe(URL);
    expect(link.getAttribute('target')).toBe('_blank');
    // 새 탭이 window.opener로 이 페이지를 건드리지 못하게
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      APPLE_MUSIC_BADGE_SRC,
    );
  });

  it('미리듣기 출처 "provided courtesy of iTunes"를 표기한다', () => {
    render(<PreviewSource url={URL} />);

    expect(screen.queryByText(NOTICES.PREVIEW_ATTRIBUTION)).not.toBeNull();
  });

  it('출처 표기는 배지 아래에 온다', () => {
    render(<PreviewSource url={URL} />);

    const badge = screen.getByRole('link', { name: 'Apple Music에서 듣기' });
    const attribution = screen.getByText(NOTICES.PREVIEW_ATTRIBUTION);
    // attribution이 문서 순서상 badge 뒤에 있다
    expect(
      badge.compareDocumentPosition(attribution) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('곡 주소가 없으면(이전 서버 응답) 배지 없이 출처 표기만 한다', () => {
    render(<PreviewSource />);

    // href 없는 <a>는 link 역할이 아니라서, 링크가 아니라 배지 이미지가 없는지 본다
    expect(screen.queryByAltText('Apple Music에서 듣기')).toBeNull();
    expect(screen.queryByText(NOTICES.PREVIEW_ATTRIBUTION)).not.toBeNull();
  });
});
