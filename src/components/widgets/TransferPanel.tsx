'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface TransferPanelProps {
  fromAccount?: string
  toAccount?: string
  availableBalance?: number
  currency?: string
  onConfirm?: (amount: string) => void
  onCancel?: () => void
  loading?: boolean
}

export function TransferPanel({
  fromAccount = 'Master Account', toAccount = 'Agent Account',
  availableBalance = 5000, currency = 'USDC',
  onConfirm = () => {}, onCancel = () => {}, loading = false,
}: TransferPanelProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const numVal = parseFloat(amount)
  const canConfirm = amount && numVal >= 10 && numVal <= availableBalance && !loading

  const handleChange = (v: string) => {
    setAmount(v)
    const n = parseFloat(v)
    if (n > availableBalance) setError('金额超过可用余额')
    else if (n < 10 && n > 0) setError('最小划转金额 $10')
    else setError(null)
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>划转资金</div>
        <button onClick={onCancel} className={styles.closeBtn}>×</button>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.transferFlow}>
          <div className={styles.transferAccount}><div className={styles.transferAccountLabel}>从</div><div className={styles.transferAccountName}>{fromAccount}</div></div>
          <div className={styles.transferArrow}>→</div>
          <div className={styles.transferAccount}><div className={styles.transferAccountLabel}>到</div><div className={styles.transferAccountName}>{toAccount}</div></div>
        </div>
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className={styles.rowBetween}>
            <label className={styles.label}>划转金额</label>
            <span className={styles.balanceHint}>可用: <strong className={styles.mono}>${availableBalance.toLocaleString()}</strong></span>
          </div>
          <div className={`${styles.inputWrap} ${error ? styles.inputWrapError : ''}`}>
            <span className={styles.inputPrefix}>$</span>
            <input type="text" value={amount} onChange={e => handleChange(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="请输入金额" className={styles.inputField} />
            <div className={styles.inputSuffix}>
              <span className={styles.currencyLabel}>{currency}</span>
              <button onClick={() => handleChange(availableBalance.toString())} className={styles.maxBtn}>MAX</button>
            </div>
          </div>
          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
        </div>
        <div className={styles.tipBox}>💡 划转后资金将立即可用于 Agent 策略</div>
      </div>
      <div className={styles.cardFooter}>
        <button onClick={onCancel} disabled={loading} className={styles.btnSecondary}>取消</button>
        <button onClick={() => onConfirm(amount)} disabled={!canConfirm} className={styles.btnPrimary}
          style={{ background: !canConfirm ? 'var(--surface-secondary)' : 'var(--brand-primary)', cursor: !canConfirm ? 'not-allowed' : 'pointer' }}>
          {loading ? '划转中...' : '确认划转'}
        </button>
      </div>
    </div>
  )
}
