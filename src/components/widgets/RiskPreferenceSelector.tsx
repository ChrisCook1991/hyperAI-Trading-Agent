'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface RiskPreferenceSelectorProps {
  value?: string | null
  onChange?: (v: string) => void
  onSubmit?: (v: string) => void
  submitLabel?: string
  disabled?: boolean
}

const OPTIONS = [
  { id: 'conservative', label: '保守型', description: '稳健收益，控制风险', icon: '🛡️', color: 'var(--success)' },
  { id: 'balanced', label: '稳健型', description: '平衡风险与收益', icon: '⚖️', color: 'var(--brand-primary)' },
  { id: 'aggressive', label: '进取型', description: '追求高收益', icon: '🚀', color: 'var(--warning)' },
]

export function RiskPreferenceSelector({
  value = null,
  onChange = () => {},
  onSubmit,
  submitLabel = '确认选择',
  disabled = false,
}: RiskPreferenceSelectorProps) {
  const [selected, setSelected] = useState<string | null>(value)

  const handleSelect = (id: string) => {
    if (disabled) return
    setSelected(id)
    onChange(id)
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>你的风险偏好是？</div>
      <div className={styles.riskGrid}>
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={disabled}
            className={`${styles.riskCard} ${selected === opt.id ? styles.riskCardSelected : ''}`}
            style={{ '--card-color': opt.color } as React.CSSProperties}
          >
            <span className={styles.riskIcon}>{opt.icon}</span>
            <span className={`${styles.riskLabel} ${selected === opt.id ? styles.riskLabelSelected : ''}`}>
              {opt.label}
            </span>
            <span className={styles.riskDesc}>{opt.description}</span>
          </button>
        ))}
      </div>
      {onSubmit && (
        <button
          onClick={() => selected && onSubmit(selected)}
          disabled={!selected || disabled}
          className={styles.btnPrimary}
          style={{
            marginTop: 'var(--spacing-sm)',
            background: !selected ? 'var(--surface-secondary)' : 'var(--brand-primary)',
            cursor: !selected ? 'not-allowed' : 'pointer',
          }}
        >
          {submitLabel}
        </button>
      )}
    </div>
  )
}
