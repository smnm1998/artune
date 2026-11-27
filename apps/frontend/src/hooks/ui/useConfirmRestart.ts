import useAppStore from '@/stores/useAppStore';

export const RESTART_CONFIRM_MESSAGE = '처음부터 다시 시작하시겠습니까?';

/** 다시하기 · ARTUNE(홈) — 결과를 버리고 입력 화면으로 가기 전에 한 번 묻는다 */
function useConfirmRestart() {
  const reset = useAppStore((state) => state.reset);

  return () => {
    if (window.confirm(RESTART_CONFIRM_MESSAGE)) {
      reset();
    }
  };
}

export default useConfirmRestart;
