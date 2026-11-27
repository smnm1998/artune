import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BrandHome from '@/components/BrandHome/BrandHome';

describe('BrandHome — 맨 위 ARTUNE 글자 로고', () => {
  const link = () => screen.getByRole('link', { name: /ARTUNE/ });

  it('누르면 주소 이동 없이 처음 화면으로 가는 동작을 부른다', () => {
    const onHome = vi.fn();
    render(<BrandHome onHome={onHome} />);

    // fireEvent는 기본 동작을 막았으면 false를 돌려준다
    const notPrevented = fireEvent.click(link());

    expect(onHome).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it('⌘·Ctrl 클릭(새 탭)은 브라우저에 맡기고 화면은 그대로 둔다', () => {
    const onHome = vi.fn();
    render(<BrandHome onHome={onHome} />);

    const notPrevented = fireEvent.click(link(), { metaKey: true });

    expect(onHome).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it('처음 화면에서는(onHome 없음) 눌러도 아무 일도 없다', () => {
    render(<BrandHome />);

    expect(fireEvent.click(link())).toBe(false);
  });
});
