'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

interface BridgePanelProps {
  fromChain?: string; toChain?: string
  fromAsset?: string; toAsset?: string
  availableBalance?: number; estimatedFee?: number; estimatedTime?: string
  onConfirm?: (amount: string) => void; onCancel?: () => void; loading?: boolean
}

export function BridgePanel({
  fromChain = 'Tron', toChain = 'Hyperliquid',
  fromAsset = 'USDT', toAsset = 'USDC',
  availableBalance = 1250, estimatedFee = 1.5, estimatedTime = '~5 分钟',
  onConfirm = () => {}, onCancel = () => {}, loading = false,
}: BridgePanelProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const num = parseFloat(amount)
  const receive = amount && num > estimatedFee ? (num - estimatedFee).toFixed(2) : '0.00'
  const canConfirm = amount && num >= 10 && num <= availableBalance && !error && !loading

  const handleChange = (v: string) => {
    setAmount(v)
    const n = parseFloat(v)
    if (n > availableBalance) setError('金额超过可用余额')
    else if (n < 10 && n > 0) setError('最小跨链金额 $10')
    else setError(null)
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>跨链 Bridge</div>
        <button onClick={onCancel} className={styles.closeBtn}>×</button>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.bridgeFlow}>
          <div className={styles.bridgeChain}><div className={styles.bridgeChainName}>{fromChain}</div><div className={styles.bridgeAsset}>{fromAsset}</div></div>
          <div className={styles.bridgeArrow}>→</div>
          <div className={styles.bridgeChain}><div className={styles.bridgeChainName}>{toChain}</div><div className={styles.bridgeAsset}>{toAsset}</div></div>
        </div>
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className={styles.rowBetween}>
            <label className={styles.label}>跨链金额</label>
            <span className={styles.balanceHint}>余额: <strong className={styles.mono}>${availableBalance.toLocaleString()}</strong></span>
          </div>
          <div className={`${styles.inputWrap} ${error ? styles.inputWrapError : ''}`}>
            <span className={styles.inputPrefix}>$</span>
            <input type="text" value={amount} onChange={e => handleChange(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="请输入金额" className={styles.inputField} />
            <div className={styles.inputSuffix}>
              <span className={styles.currencyLabel}>{fromAsset}</span>
              <button onClick={() => handleChange(Math.max(0, availableBalance - estimatedFee).toFixed(2))} className={styles.maxBtn}>MAX</button>
            </div>
          </div>
          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
        </div>
        <div className={styles.bridgeInfo}>
          <div className={styles.detailRow}><span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>实际到账</span><span className={styles.mono} style={{ fontWeight: 'var(--weight-bold)', color: 'var(--success)' }}>${receive} {toAsset}</span></div>
          <div className={styles.detailRow}><span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>预估手续费</span><span className={styles.mono}>${estimatedFee}</span></div>
          <div className={styles.detailRow}><span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>预估时间</span><span>{estimatedTime}</span></div>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <button onClick={onCancel} disabled={loading} className={styles.btnSecondary}>取消</button>
        <button onClick={() => onConfirm(amount)} disabled={!canConfirm} className={styles.btnPrimary}
          style={{ background: !canConfirm ? 'var(--surface-secondary)' : 'var(--brand-primary)', cursor: !canConfirm ? 'not-allowed' : 'pointer' }}>
          {loading ? '跨链中...' : '确认跨链'}
        </button>
      </div>
    </div>
  )
}
