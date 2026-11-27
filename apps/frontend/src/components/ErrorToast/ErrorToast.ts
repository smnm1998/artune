import toast from 'react-hot-toast';
import { colors } from '@/styles/theme';

/**
 * 에러 토스트를 표시하는 헬퍼 함수
 *
 * @param {string} message - 표시할 에러 메시지
 * @returns {string} toast ID
 */
export const showErrorToast = (message: string) => {
  return toast.error(message, {
    duration: 4000,
    position: 'top-center',
    style: {
      background: colors.error,
      color: colors.text.onAccent,
      padding: '16px 20px',
      borderRadius: '14px',
      boxShadow: colors.shadow.toast,
      fontSize: '14px',
      fontWeight: '500',
      minWidth: '320px',
      maxWidth: '500px',
    },
    icon: '⚠️',
  });
};
