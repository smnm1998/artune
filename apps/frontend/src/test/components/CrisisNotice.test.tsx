import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrisisNotice from '@/components/CrisisNotice/CrisisNotice';

describe('CrisisNotice', () => {
  it('누르면 바로 걸리는 109 상담전화 링크를 보여준다', () => {
    render(<CrisisNotice />);

    const call = screen.getByRole('link', { name: /109/ });
    expect(call.getAttribute('href')).toBe('tel:109');
  });
});
