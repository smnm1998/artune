import { motion } from 'framer-motion';
import { IoSend } from 'react-icons/io5';
import ProgressBar from './ProgressBar';
import {
  loadingContainerStyle,
  iconWrapperStyle,
  iconStyle,
  progressWrapperStyle,
  loadingTextStyle,
} from './Loading.styles';

interface LoadingProps {
  progress?: number;
  message?: string;
  onComplete?: () => void;
}

function Loading({ progress = 0, message, onComplete }: LoadingProps) {
  const isComplete = progress >= 100;

  return (
    <div css={loadingContainerStyle}>
      <motion.div
        css={iconWrapperStyle}
        initial={{ x: '-100vw' }}
        animate={{
          x: isComplete ? '200vw' : 0,
        }}
        transition={{
          duration: 1.6,
          ease: 'easeInOut',
        }}
        onAnimationComplete={() => {
          if (isComplete && onComplete) {
            onComplete();
          }
        }}
      >
        <motion.div
          css={iconStyle}
          animate={
            !isComplete
              ? {
                  y: [-8, 8, -8],
                  rotate: [-3, 3, -3],
                }
              : {}
          }
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <IoSend size={48} color="#f9f9f9" />
        </motion.div>
      </motion.div>

      <motion.div
        css={progressWrapperStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: isComplete ? 0 : 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <ProgressBar value={progress} />
        <p css={loadingTextStyle}>{message || '감정을 분석하고 있어요...'}</p>
      </motion.div>
    </div>
  );
}

export default Loading;
