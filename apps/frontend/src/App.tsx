import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import EmotionInputPage from '@/pages/EmotionInputPage';
import { Loading } from '@/components';
import ResultPage from '@/pages/ResultPage';
import useAppStore from '@/stores/useAppStore';
import { showErrorToast } from '@/components/ErrorToast/ErrorToast';

/**
 * 메인 애플리케이션 컴포넌트
 * 페이지 전환 및 감정 분석 플로우를 Zustand로 관리
 */
function App() {
  // Zustand store에서 필요한 상태와 액션 선택
  const currentPage = useAppStore((state) => state.currentPage);
  const progress = useAppStore((state) => state.progress);
  const loadingMessage = useAppStore((state) => state.loadingMessage);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);
  const setPage = useAppStore((state) => state.setPage);

  /**
   * 에러 발생 시 토스트 표시
   */
  useEffect(() => {
    if (error) {
      showErrorToast(error);
      clearError(); // 토스트 표시 후 에러 상태 초기화
    }
  }, [error, clearError]);

  /**
   * 로딩 완료 핸들러
   * Loading 컴포넌트의 애니메이션이 완료되면 결과 페이지로 전환
   */
  const handleLoadingComplete = () => {
    setPage('result');
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, #000f00 0%, #0d0d0d 100%)',
      }}
    >
      {/* 토스트 컨테이너 */}
      <Toaster />

      <AnimatePresence mode="wait">
        {/* 입력 페이지 */}
        {currentPage === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          >
            <EmotionInputPage />
          </motion.div>
        )}

        {/* 로딩 페이지 */}
        {currentPage === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          >
            <Loading
              progress={progress}
              message={loadingMessage}
              onComplete={handleLoadingComplete}
            />
          </motion.div>
        )}

        {/* 결과 페이지 */}
        {currentPage === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              overflow: 'auto',
            }}
          >
            <ResultPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
