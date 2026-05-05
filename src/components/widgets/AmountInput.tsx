'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface AmountInputProps {
  value?: string
  onChange?: (v: string) => void
  onSubmit?: (v: string) => void
  submitLabel?: string
  currency?: string
  min?: number
  max?: number | null
  error?: string | null
  disabled?: boolean
  balance?: number | null
  placeholder?: string
}

export function AmountInput({
  value = '',
  onChange = () => {},
  onSubmit,
  submitLabel = '确认金额',
  currency = 'USDC',
  min = 10,
  max = null,
  error = null,
  disabled = false,
  balance = null,
  placeholder = '请输入金额',
}: AmountInputProps) {
  // Internal state so the input works even when rendered via SpecRenderer with static props
  const [internalValue, setInternalValue] = useState(value)
  const [focused, setFocused] = useState(false)

  const handleChange = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '')
    setInternalValue(clean)
    onChange(clean)
  }

  const handleMax = () => {
    if (balance == null) return
    const v = balance.toString()
    setInternalValue(v)
    onChange(v)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  // Derive validation error from internal value
  const numVal = parseFloat(internalValue)
  const validationError =
    error ||
    (internalValue && numVal < min ? `最小金额 $${min}` : null) ||
    (max && internalValue && numVal > max ? `最大金额 $${max}` : null)

  return (
    <div className={styles.container}>
      <div className={styles.rowBetween}>
        <label className={styles.label}>投入金额</label>
        {balance !== null && (
          <span className={styles.balanceHint}>
            可用余额: <strong className={styles.mono}>${fmt(balance!)}</strong>
          </span>
        )}
      </div>
      <div
        className={`${styles.inputWrap} ${focused ? styles.inputWrapFocused : ''} ${validationError ? styles.inputWrapError : ''} ${disabled ? styles.inputWrapDisabled : ''}`}
      >
        <span className={styles.inputPrefix}>$</span>
        <input
          type="text"
          value={internalValue}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={styles.inputField}
        />
        <div className={styles.inputSuffix}>
          <span className={styles.currencyLabel}>{currency}</span>
          {balance !== null && (
            <button onClick={handleMax} disabled={disabled} className={styles.maxBtn}>
              MAX
            </button>
          )}
        </div>
      </div>
      {validationError && <div className={styles.errorMsg}>⚠️ {validationError}</div>}
      {!validationError && min && (
        <div className={styles.hint}>最小金额: ${min}</div>
      )}
      {onSubmit && (
        <button
          onClick={() => onSubmit(internalValue)}
          disabled={disabled || !internalValue || !!validationError}
          className={styles.btnPrimary}
          style={{
            marginTop: 'var(--spacing-sm)',
            background: (!internalValue || !!validationError) ? 'var(--surface-secondary)' : 'var(--brand-primary)',
            cursor: (!internalValue || !!validationError) ? 'not-allowed' : 'pointer',
          }}
        >
          {submitLabel}
        </button>
      )}
    </div>
  )
}
