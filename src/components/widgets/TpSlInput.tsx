'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface TpSlInputProps {
  tpValue?: string
  slValue?: string
  onTpChange?: (v: string) => void
  onSlChange?: (v: string) => void
  onSubmit?: (tp: string, sl: string) => void
  currentPrice?: number | null
  entryPrice?: number | null
  disabled?: boolean
}

export function TpSlInput({
  tpValue = '',
  slValue = '',
  onTpChange = () => {},
  onSlChange = () => {},
  onSubmit,
  currentPrice = null,
  entryPrice = null,
  disabled = false,
}: TpSlInputProps) {
  // Internal state so inputs work in SpecRenderer context
  const [tp, setTp] = useState(tpValue)
  const [sl, setSl] = useState(slValue)
  const [tpFocused, setTpFocused] = useState(false)
  const [slFocused, setSlFocused] = useState(false)

  const handleTpChange = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '')
    setTp(clean)
    onTpChange(clean)
  }

  const handleSlChange = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '')
    setSl(clean)
    onSlChange(clean)
  }

  const base = entryPrice ?? currentPrice
  const tpPrice = base && tp ? (base * (1 + parseFloat(tp) / 100)).toFixed(2) : null
  const slPrice = base && sl ? (base * (1 - parseFloat(sl) / 100)).toFixed(2) : null

  const canSubmit = !disabled && !!(tp || sl)

  return (
    <div className={styles.container}>
      <div className={styles.label}>止盈 / 止损设置</div>
      <div className={styles.tpslGrid}>
        {/* TP */}
        <div>
          <div className={styles.tpslFieldLabel} style={{ color: 'var(--success)' }}>
            📈 止盈 (Take Profit)
          </div>
          <div
            className={`${styles.tpslInputWrap} ${tpFocused ? styles.tpslInputFocusedTp : ''}`}
          >
            <input
              type="text"
              value={tp}
              onChange={e => handleTpChange(e.target.value)}
              onFocus={() => setTpFocused(true)}
              onBlur={() => setTpFocused(false)}
              placeholder="0"
              disabled={disabled}
              className={styles.tpslInput}
            />
            <span className={styles.tpslSuffix}>%</span>
          </div>
          {tpPrice && (
            <div className={styles.tpslPriceHint} style={{ color: 'var(--success)' }}>
              ≈ ${tpPrice}
            </div>
          )}
        </div>

        {/* SL */}
        <div>
          <div className={styles.tpslFieldLabel} style={{ color: 'var(--danger)' }}>
            📉 止损 (Stop Loss)
          </div>
          <div
            className={`${styles.tpslInputWrap} ${slFocused ? styles.tpslInputFocusedSl : ''}`}
          >
            <input
              type="text"
              value={sl}
              onChange={e => handleSlChange(e.target.value)}
              onFocus={() => setSlFocused(true)}
              onBlur={() => setSlFocused(false)}
              placeholder="0"
              disabled={disabled}
              className={styles.tpslInput}
            />
            <span className={styles.tpslSuffix}>%</span>
          </div>
          {slPrice && (
            <div className={styles.tpslPriceHint} style={{ color: 'var(--danger)' }}>
              ≈ ${slPrice}
            </div>
          )}
        </div>
      </div>

      {!sl && (
        <div className={styles.tpslWarning}>⚠️ 建议设置止损，避免亏损扩大</div>
      )}

      {onSubmit && (
        <button
          onClick={() => onSubmit(tp, sl)}
          disabled={!canSubmit}
          className={styles.btnPrimary}
          style={{
            marginTop: 'var(--spacing-sm)',
            background: canSubmit ? 'var(--brand-primary)' : 'var(--surface-secondary)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          确认止盈止损设置
        </button>
      )}
    </div>
  )
}
