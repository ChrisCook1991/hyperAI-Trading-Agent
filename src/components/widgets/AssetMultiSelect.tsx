'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

const ASSETS = [
  { id: 'BTC', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png', color: '#F7931A', apy: '8.2%' },
  { id: 'ETH', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png', color: '#627EEA', apy: '12.5%' },
  { id: 'SOL', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png', color: '#14F195', apy: '15.8%' },
  { id: 'HYPE', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png', color: '#007FFF', apy: '18.3%' },
]

interface AssetMultiSelectProps {
  value?: string[]
  onChange?: (v: string[]) => void
  onSubmit?: (v: string[]) => void
  submitLabel?: string
  disabled?: boolean
  max?: number | null
}

export function AssetMultiSelect({
  value = [],
  onChange = () => {},
  onSubmit,
  submitLabel = '确认资产选择',
  disabled = false,
  max = null,
}: AssetMultiSelectProps) {
  const [selected, setSelected] = useState<string[]>(value)

  const toggle = (id: string) => {
    if (disabled) return
    let next: string[]
    if (selected.includes(id)) {
      next = selected.filter(v => v !== id)
    } else {
      if (max && selected.length >= max) return
      next = [...selected, id]
    }
    setSelected(next)
    onChange(next)
  }

  return (
    <div className={styles.container}>
      <div className={styles.rowBetween}>
        <div className={styles.label}>选择目标资产</div>
        <div className={styles.hint}>已选 {selected.length}{max ? `/${max}` : ''}</div>
      </div>
      <div className={styles.assetGrid}>
        {ASSETS.map(asset => {
          const isSelected = selected.includes(asset.id)
          const maxed = !!(max && selected.length >= max && !isSelected)
          return (
            <button
              key={asset.id}
              onClick={() => toggle(asset.id)}
              disabled={disabled || maxed}
              className={`${styles.assetCard} ${isSelected ? styles.assetCardSelected : ''} ${maxed ? styles.assetCardDisabled : ''}`}
              style={{ '--card-color': asset.color } as React.CSSProperties}
            >
              {isSelected && (
                <span className={styles.assetCheck} style={{ background: asset.color }}>✓</span>
              )}
              <div className={styles.assetLogo} style={{ background: `${asset.color}15` }}>
                <img src={asset.logo} alt={asset.id} width={32} height={32} />
              </div>
              <div className={styles.assetInfo}>
                <span
                  className={`${styles.assetId} ${isSelected ? styles.assetIdSelected : ''}`}
                  style={isSelected ? { color: asset.color } : {}}
                >
                  {asset.id}
                </span>
                <span className={styles.assetApy}>APY ~{asset.apy}</span>
              </div>
            </button>
          )
        })}
      </div>
      <div className={styles.tipBox}>💡 提示：选择多个资产可以分散风险</div>
      {onSubmit && (
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
          <button
            onClick={() => onSubmit(selected)}
            disabled={disabled}
            className={styles.btnPrimary}
            style={{ flex: 2 }}
          >
            {selected.length === 0 ? 'AI 自动推荐资产' : submitLabel}
          </button>
        </div>
      )}
    </div>
  )
}
