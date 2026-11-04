import * as styles from './CrisisNotice.styles';

/**
 * 위기 신호(자해·자살 의도)가 감지된 결과에만 띄우는 상담 안내
 * 추천은 그대로 보여주고, 그 위에 연결할 곳을 알려준다.
 */
function CrisisNotice() {
  return (
    <aside css={styles.notice} aria-label="상담 안내">
      <p css={styles.message}>
        마음이 많이 힘들다면, 혼자 견디지 않아도 괜찮아요.
      </p>
      <a css={styles.call} href="tel:109">
        자살예방상담전화 109 · 24시간
      </a>
    </aside>
  );
}

export default CrisisNotice;
