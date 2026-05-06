import toast from 'react-hot-toast';

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
      background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
      color: '#ffffff',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      fontSize: '14px',
      fontWeight: '500',
      minWidth: '320px',
      maxWidth: '500px',
    },
    icon: '⚠️',
  });
};
