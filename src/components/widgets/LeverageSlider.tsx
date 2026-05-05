'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface LeverageSliderProps {
  value?: number
  onChange?: (v: number) => void
  min?: number
  max?: number
  disabled?: boolean
  marketType?: 'perp' | 'spot'
}

const getRisk = (v: number) => {
  if (v <= 2) return { label: '低风险', color: 'var(--success)' }
  if (v <= 3) return { label: '中风险', color: 'var(--brand-primary)' }
  if (v <= 4) return { label: '高风险', color: 'var(--warning)' }
  return { label: '极高风险', color: 'var(--danger)' }
}

export function LeverageSlider({
  value = 1,
  onChange = () => {},
  min = 1,
  max = 5,
  disabled = false,
  marketType = 'perp',
}: LeverageSliderProps) {
  // Internal state so the slider works when rendered via SpecRenderer
  const [leverage, setLeverage] = useState(value)
  const [dragging, setDragging] = useState(false)

  const handleChange = (v: number) => {
    setLeverage(v)
    onChange(v)
  }

  if (marketType === 'spot') {
    return (
      <div className={styles.container}>
        <div className={styles.leverageSpotNote}>现货交易无杠杆（1x）</div>
      </div>
    )
  }

  const risk = getRisk(leverage)
  const pct = ((leverage - min) / (max - min)) * 100
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  return (
    <div className={styles.container}>
      <div className={styles.rowBetween}>
        <div className={styles.label}>杠杆倍数</div>
        <div className={styles.leverageDisplay}>
          <span className={styles.leverageValue} style={{ color: risk.color }}>{leverage}x</span>
          <span
            className={styles.leverageBadge}
            style={{ color: risk.color, background: `${risk.color}15` }}
          >
            {risk.label}
          </span>
        </div>
      </div>

      <div className={styles.sliderTrack} style={{ opacity: disabled ? 0.5 : 1 }}>
        <div className={styles.sliderFill} style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={leverage}
          onChange={e => handleChange(parseFloat(e.target.value))}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          disabled={disabled}
          className={styles.sliderInput}
        />
        <div
          className={styles.sliderThumb}
          style={{
            left: `${pct}%`,
            borderColor: risk.color,
            transition: dragging ? 'none' : undefined,
          }}
        />
      </div>

      <div className={styles.sliderTicks}>
        {ticks.map(t => <span key={t}>{t}x</span>)}
      </div>

      <div
        className={`${styles.leverageWarning} ${leverage > 3 ? styles.leverageWarningHigh : styles.leverageWarningLow}`}
      >
        <div className={styles.leverageWarningTitle}>
          {leverage > 3 ? '⚠️ 高杠杆风险提示' : '💡 风险说明'}
        </div>
        <div className={styles.leverageWarningText}>
          {leverage > 3
            ? `${leverage}x 杠杆下，市场小幅波动即可能触发强平，请谨慎操作。`
            : `当前杠杆 ${leverage}x，为中低风险范围，适合大多数交易场景。`}
        </div>
      </div>
    </div>
  )
}
