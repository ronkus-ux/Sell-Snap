import styles from './StepIndicator.module.css';

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className={styles.indicator}>
      {[1, 2, 3].map((step) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className={styles.stepGroup}>
            <div
              className={`${styles.circle} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''}`}
            >
              {isCompleted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step
              )}
            </div>
            {step < 3 && (
              <div
                className={`${styles.line} ${isCompleted ? styles.lineActive : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
