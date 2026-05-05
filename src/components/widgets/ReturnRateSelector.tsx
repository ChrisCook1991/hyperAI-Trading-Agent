'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface ReturnRateSelectorProps {
  value?: string | null
  onChange?: (v: string) => void
  onSubmit?: (v: string) => void
  submitLabel?: string
  disabled?: boolean
}

const OPTIONS = [
  { id: 'low', range: '5% - 12%', label: '稳健收益', color: 'var(--success)' },
  { id: 'medium', range: '12% - 18%', label: '平衡收益', color: 'var(--brand-primary)' },
  { id: 'high', range: '18% - 25%', label: '积极收益', color: 'var(--warning)' },
  { id: 'vhigh', range: '25%+', label: '高风险高收益', color: 'var(--danger)' },
]

export function ReturnRateSelector({
  value = null,
  onChange = () => {},
  onSubmit,
  submitLabel = '确认选择',
  disabled = false,
}: ReturnRateSelectorProps) {
  const [selected, setSelected] = useState<string | null>(value)

  const handleSelect = (id: string) => {
    if (disabled) return
    setSelected(id)
    onChange(id)
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>期望的年化收益率</div>
      <div className={styles.returnGrid}>
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={disabled}
            className={`${styles.returnCard} ${selected === opt.id ? styles.returnCardSelected : ''}`}
            style={{ '--card-color': opt.color } as React.CSSProperties}
          >
            <span className={`${styles.returnRange} ${selected === opt.id ? styles.returnRangeSelected : ''}`}>
              {opt.range}
            </span>
            <span className={styles.returnLabel}>{opt.label}</span>
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
