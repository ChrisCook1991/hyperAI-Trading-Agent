'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface RiskBannerProps {
  type?: 'info' | 'warning' | 'danger'
  title?: string
  message?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const CONFIG = {
  danger: { icon: '⚠️', bg: 'var(--danger-light)', color: 'var(--danger)' },
  warning: { icon: '⚠️', bg: 'var(--warning-light)', color: 'var(--warning)' },
  info: { icon: 'ℹ️', bg: 'var(--info-light)', color: 'var(--info)' },
}

export function RiskBanner({ type = 'warning', title, message, dismissible = true, onDismiss }: RiskBannerProps) {
  const [visible, setVisible] = useState(true)
  const cfg = CONFIG[type]
  if (!visible) return null
  return (
    <div className={styles.riskBanner} style={{ background: cfg.bg }}>
      <span className={styles.riskBannerIcon}>{cfg.icon}</span>
      <div className={styles.riskBannerContent}>
        {title && <div className={styles.riskBannerTitle}>{title}</div>}
        <div className={styles.riskBannerMsg}>{message}</div>
      </div>
      {dismissible && (
        <button onClick={() => { setVisible(false); onDismiss?.() }} className={styles.riskBannerClose}>×</button>
      )}
    </div>
  )
}
