'use client'
import styles from './widgets.module.css'

interface ConfirmDialogProps {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  emphasis?: 'default' | 'warning' | 'danger'
  onConfirm?: () => void
  onCancel?: () => void
  loading?: boolean
}

const EMPHASIS_COLOR = { default: 'var(--brand-primary)', warning: 'var(--warning)', danger: 'var(--danger)' }

export function ConfirmDialog({
  title = '确认操作', message = '确定要执行此操作吗？',
  confirmLabel = '确认', cancelLabel = '取消',
  emphasis = 'default',
  onConfirm = () => {}, onCancel = () => {},
  loading = false,
}: ConfirmDialogProps) {
  const color = EMPHASIS_COLOR[emphasis]
  return (
    <div className={styles.card}>
      <div className={styles.confirmHeader}>
        <div className={styles.confirmIcon} style={{ background: `${color}15`, color }}>
          {emphasis === 'danger' ? '⚠️' : emphasis === 'warning' ? '⚡' : '✓'}
        </div>
        <div className={styles.confirmTitle}>{title}</div>
        <div className={styles.confirmMessage}>{message}</div>
      </div>
      <div className={styles.cardFooter}>
        <button onClick={onCancel} disabled={loading} className={styles.btnSecondary}>{cancelLabel}</button>
        <button onClick={onConfirm} disabled={loading} className={styles.btnPrimary}
          style={{ background: loading ? 'var(--surface-secondary)' : color }}>
          {loading ? '处理中...' : confirmLabel}
        </button>
      </div>
    </div>
  )
}
