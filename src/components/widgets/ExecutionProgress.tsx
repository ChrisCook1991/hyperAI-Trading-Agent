'use client'
import styles from './widgets.module.css'

interface Step { label: string; description?: string; error?: string }

interface ExecutionProgressProps {
  steps?: Step[]
  currentStep?: number
  status?: 'processing' | 'success' | 'error'
}

export function ExecutionProgress({ steps = [], currentStep = 0, status = 'processing' }: ExecutionProgressProps) {
  return (
    <div className={styles.progressCard}>
      <div className={styles.progressTitle}>
        {status === 'success' ? '✅ 执行完成' : status === 'error' ? '❌ 执行失败' : '⏳ 执行中...'}
      </div>
      <div className={styles.progressSteps}>
        {steps.map((step, i) => {
          const done = i < currentStep
          const current = i === currentStep
          const isErr = current && status === 'error'
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div className={styles.progressStep}>
                <div className={styles.progressIcon}
                  style={{
                    background: done ? 'var(--success)' : isErr ? 'var(--danger)' : current ? 'var(--surface-accent)' : 'var(--surface-secondary)',
                    color: done ? 'white' : isErr ? 'white' : current ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  }}>
                  {done ? '✓' : isErr ? '✕' : current ? <span className={styles.spinner} /> : '•'}
                </div>
                <div className={styles.progressContent}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: current ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {step.label}
                  </div>
                  {step.description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{step.description}</div>}
                  {isErr && step.error && (
                    <div className={styles.progressError}>{step.error}</div>
                  )}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={styles.progressLine} style={{ background: done ? 'var(--success)' : 'var(--border-light)' }} />
              )}
            </div>
          )
        })}
      </div>
      {status === 'success' && currentStep >= steps.length && (
        <div className={styles.progressSuccess}>✓ 所有步骤执行完成</div>
      )}
      {status === 'error' && (
        <div className={styles.progressErrorBanner}>✕ 执行失败，请重试</div>
      )}
    </div>
  )
}
