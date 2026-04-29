import { useLayoutEffect, useRef } from 'react';

/**
 * textarea를 내용에 따라 자동으로 크기 조절하는 훅
 * @param {string} value - textarea의 현재 값
 * @param {string} placeholder - placeholder 텍스트 (높이 재계산 트리거)
 * @param {number} minHeight - 최소 높이 (기본값: 57px)
 * @returns {React.RefObject} textarea ref
 */
function useAutoResizeTextarea(
  value: string,
  placeholder: string,
  minHeight = 57,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // useLayoutEffect: 브라우저가 화면을 그리기 전에 실행 (모바일에서 깜빡임 방지)
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, placeholder, minHeight]);

  return textareaRef;
}

export default useAutoResizeTextarea;
