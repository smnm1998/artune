import { brandStyle } from './BrandHome.styles';

interface BrandHomeProps {
  /** 처음(입력) 화면으로 가기 — 없으면 이미 처음 화면이라 아무것도 하지 않는다 */
  onHome?: () => void;
}

/**
 * 맨 위 글자 로고 "ARTUNE" — 누르면 처음 화면으로 (11/27 리디자인: 아이콘 대신 대문자 글자, 홈 버튼 겸).
 * 한 화면 앱이라 주소 이동은 막고 onHome만 부른다. ⌘·Ctrl·Shift·가운데 클릭(새 탭)은 브라우저에 맡긴다
 */
function BrandHome({ onHome }: BrandHomeProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onHome?.();
  };

  return (
    <a
      href="/"
      css={brandStyle}
      onClick={handleClick}
      aria-label="ARTUNE 처음 화면으로"
    >
      ARTUNE
    </a>
  );
}

export default BrandHome;
