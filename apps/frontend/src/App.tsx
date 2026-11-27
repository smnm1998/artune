import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import EmotionInputPage from '@/pages/EmotionInputPage';
import ResultPage from '@/pages/ResultPage';
import useAppStore from '@/stores/useAppStore';
import { showErrorToast } from '@/components/ErrorToast/ErrorToast';
import { appStyle, pageStyle } from './App.styles';

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

      <AnimatePresence mode="wait">
        {currentPage === 'input' && (
          <motion.div
            key="input"
            css={pageStyle}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <EmotionInputPage />
          </motion.div>
        )}

        {currentPage === 'result' && (
          <motion.div
            key="result"
            css={pageStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ResultPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
