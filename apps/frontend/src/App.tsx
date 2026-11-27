import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import EmotionInputPage from '@/pages/EmotionInputPage';
import ResultPage from '@/pages/ResultPage';
import useAppStore from '@/stores/useAppStore';
import { showErrorToast } from '@/components/ErrorToast/ErrorToast';
import { appStyle, pageStyle } from './App.styles';

/** 들어오는 화면과 나가는 화면이 같은 시간에 엇갈린다 — 나가는 쪽은 그동안 누를 수 없게 */
const crossFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, pointerEvents: 'auto' as const },
  exit: { opacity: 0, pointerEvents: 'none' as const },
  transition: { duration: 0.5, ease: 'easeInOut' as const },
};

/** 입력 화면 ↔ 결과 화면 — 스트림이 열리면(HTTP 200) 결과 화면으로 넘어간다 (스토어 currentPage) */
function App() {
  const currentPage = useAppStore((state) => state.currentPage);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  // 실패는 스토어가 error에 넣는다 — 토스트로 띄우고 비운다
  useEffect(() => {
    if (error) {
      showErrorToast(error);
      clearError();
    }
  }, [error, clearError]);

  return (
    <div css={appStyle}>
      <Toaster />

      {/* 교차 페이드 — 두 화면이 같은 자리(pageStyle: absolute)에 겹쳐, 나가는 화면이 사라지는 동안 들어오는 화면이 나타난다.
          첫 화면(앱을 열 때)은 페이드 없이(initial={false}) */}
      <AnimatePresence initial={false}>
        {currentPage === 'input' && (
          <motion.div key="input" css={pageStyle} {...crossFade}>
            <EmotionInputPage />
          </motion.div>
        )}

        {currentPage === 'result' && (
          <motion.div key="result" css={pageStyle} {...crossFade}>
            <ResultPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
