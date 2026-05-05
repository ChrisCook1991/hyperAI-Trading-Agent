'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface MarketTypeSelectorProps {
  value?: 'perp' | 'spot' | null
  onChange?: (v: 'perp' | 'spot') => void
  disabled?: boolean
}

export function MarketTypeSelector({
  value = null,
  onChange = () => {},
  disabled = false,
}: MarketTypeSelectorProps) {
  // Internal state so selection persists in SpecRenderer context
  const [selected, setSelected] = useState<'perp' | 'spot' | null>(value)

  const handleSelect = (id: 'perp' | 'spot') => {
    if (disabled) return
    setSelected(id)
    onChange(id)
  }

  const options = [
    { id: 'perp' as const, label: '永续合约', sublabel: 'Perpetual', desc: '支持杠杆 · 做多做空', color: 'var(--brand-primary)', icon: '📊' },
    { id: 'spot' as const, label: '现货', sublabel: 'Spot', desc: '无杠杆 · 买入卖出', color: 'var(--success)', icon: '💱' },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.label}>交易类型</div>
      <div className={styles.mktGrid}>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={disabled}
            className={`${styles.mktCard} ${selected === opt.id ? styles.mktCardSelected : ''}`}
            style={{ '--card-color': opt.color } as React.CSSProperties}
          >
            <span className={styles.mktIcon}>{opt.icon}</span>
            <span
              className={`${styles.mktLabel} ${selected === opt.id ? styles.mktLabelSelected : ''}`}
              style={selected === opt.id ? { color: opt.color } : {}}
            >
              {opt.label}
            </span>
            <span className={styles.mktSublabel}>{opt.sublabel}</span>
            <span className={styles.mktDesc}>{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
