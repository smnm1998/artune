import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// jest-dom matchers를 Vitest expect에 추가
expect.extend(matchers);

// 각 테스트 후 자동 cleanup
afterEach(() => {
  cleanup();
});

vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
  },
  AnimatePresence: ({ children }) => children,
  // 화면이 사라지는 중인지 — 기본은 '있음'. 사라지는 동안을 보는 테스트는 mockReturnValue(false)
  useIsPresent: vi.fn(() => true),
}));
