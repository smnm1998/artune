import { useEffect, useLayoutEffect, useRef } from 'react';

/** 내용 높이에 맞춘다 — 최소·최대 높이는 CSS(min-height · max-height)가 정한다 */
function fitToContent(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/**
 * textarea를 내용에 따라 자동으로 크기 조절하는 훅.
 * 글이 바뀔 때와 폭이 바뀔 때(창 크기 · PC ↔ 모바일) 다시 잰다 — 폭이 바뀌면 같은 글도 줄 수가 달라진다
 * (11/27 전: 최소 높이를 PC 기준 57px로 고정해 모바일 칸(52px)도 57px이었고, 폭이 바뀌어도 그대로였다)
 * @param value - textarea의 현재 값
 * @param placeholder - placeholder 텍스트 (비어 있을 때 높이 재계산 트리거)
 */
function useAutoResizeTextarea(value: string, placeholder: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // useLayoutEffect: 브라우저가 화면을 그리기 전에 실행 (모바일에서 깜빡임 방지)
  useLayoutEffect(() => {
    if (textareaRef.current) fitToContent(textareaRef.current);
  }, [value, placeholder]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return;

    // 높이는 이 훅이 바꾸므로 폭이 바뀔 때만 다시 잰다 (높이 변화까지 받으면 스스로를 계속 부른다)
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === lastWidth) return;
      lastWidth = textarea.clientWidth;
      fitToContent(textarea);
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  return textareaRef;
}

export default useAutoResizeTextarea;
