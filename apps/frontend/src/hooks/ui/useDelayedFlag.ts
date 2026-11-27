import { useEffect, useState } from 'react';

/**
 * active가 delayMs 넘게 이어질 때만 true — 금방 끝나는 상태(짧은 로딩)를 화면에 번쩍 띄우지 않으려고.
 * 예: 미리듣기가 0.4초 안에 재생되면 '재생 준비 중'을 건너뛰고 바로 '재생 중'
 */
function useDelayedFlag(active: boolean, delayMs: number) {
  const [elapsed, setElapsed] = useState(false);
  // active가 바뀌면 처음부터 다시 잰다 (렌더 중 조정 — 이펙트에서 바로 setState하지 않게)
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setElapsed(false);
  }

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return active && elapsed;
}

export default useDelayedFlag;
