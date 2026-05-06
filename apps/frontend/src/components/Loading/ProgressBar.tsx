import { motion } from 'framer-motion';
import {
  progressBarContainerStyle,
  progressBarFillStyle,
  progressPercentageStyle,
} from './Loading.styles';

interface ProgressBarProps {
  value: number;
}

/**
 * 프로그래스 바 컴포넌트
 * @param {number} value - 진행률 (0-100)
 */
function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div>
      {/* 진행률 퍼센트 표시 */}
      <motion.div
        css={progressPercentageStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {Math.round(value)}%
      </motion.div>

      {/* 프로그래스 바 배경 */}
      <div css={progressBarContainerStyle}>
        {/* 프로그래스 바 채워지는 부분 */}
        <motion.div
          css={progressBarFillStyle}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{
            duration: 0.3,
            ease: 'easeOut',
          }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
