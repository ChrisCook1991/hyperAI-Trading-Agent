'use client'
import styles from './widgets.module.css'

const ASSET_LOGOS: Record<string, string> = {
  BTC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  HYPE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
}

interface StrategyStatusCardProps {
  strategyName?: string
  strategyId?: string
  status?: 'pending' | 'running' | 'paused' | 'stopped' | 'completed'
  totalInvestment?: number
  currentEquity?: number
  totalPnl?: number
  roe?: number
  assets?: string[]
  nextRebalance?: string
  lastUpdate?: string
  onViewDetails?: () => void
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
}

const STATUS_CFG = {
  pending: { label: '待启动', color: 'var(--text-secondary)', bg: 'var(--surface-secondary)', icon: '⏳' },
  running: { label: '运行中', color: 'var(--success)', bg: 'var(--success-light)', icon: '▶️' },
  paused: { label: '已暂停', color: 'var(--warning)', bg: 'var(--warning-light)', icon: '⏸️' },
  stopped: { label: '已停止', color: 'var(--text-secondary)', bg: 'var(--surface-secondary)', icon: '⏹️' },
  completed: { label: '已完成', color: 'var(--brand-primary)', bg: 'var(--surface-accent)', icon: '✓' },
}

export function StrategyStatusCard({
  strategyName = 'Funding Harvester', strategyId = 'FH-001', status = 'running',
  totalInvestment = 2500, currentEquity = 2615.5, totalPnl = 115.5, roe = 4.62,
  assets = ['BTC', 'ETH'], nextRebalance = '2h 15m', lastUpdate = '5分钟前',
  onViewDetails = () => {}, onPause = () => {}, onResume = () => {}, onStop = () => {},
}: StrategyStatusCardProps) {
  const cfg = STATUS_CFG[status]
  const pnlColor = totalPnl >= 0 ? 'var(--success)' : 'var(--danger)'
  const sign = totalPnl >= 0 ? '+' : ''
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ flex: 1 }}>
          <div className={styles.cardSubtitle}>策略 · {strategyId}</div>
          <div className={styles.strategyTitle}>{strategyName}</div>
          <div className={styles.assetTags} style={{ marginTop: 'var(--spacing-xs)' }}>
            {assets.map(a => (
              <div key={a} className={styles.assetTag}>
                <img src={ASSET_LOGOS[a]} alt={a} width={16} height={16} style={{ borderRadius: '50%' }} />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      {/* PnL */}
      <div className={styles.pnlGrid}>
        <div>
          <div className={styles.pnlLabel}>总盈亏</div>
          <div className={styles.pnlValue} style={{ color: pnlColor }}>{sign}${Math.abs(totalPnl).toFixed(2)}</div>
        </div>
        <div>
          <div className={styles.pnlLabel}>回报率</div>
          <div className={styles.pnlValue} style={{ color: pnlColor }}>{sign}{roe.toFixed(2)}%</div>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.detailRow}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>总投入</span>
          <span className={styles.mono} style={{ fontWeight: 'var(--weight-semibold)' }}>${totalInvestment.toLocaleString()}</span>
        </div>
        <div className={styles.detailRow}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>当前权益</span>
          <span className={styles.mono} style={{ fontWeight: 'var(--weight-semibold)' }}>${currentEquity.toLocaleString()}</span>
        </div>
        {status === 'running' && (
          <div className={styles.rebalanceRow}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.pulseDot} />下次再平衡
            </span>
            <span className={styles.mono} style={{ color: 'var(--brand-primary)', fontWeight: 'var(--weight-semibold)' }}>{nextRebalance}</span>
          </div>
        )}
        <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-xs)' }}>
          最后更新: {lastUpdate}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <button onClick={onViewDetails} className={styles.btnSecondary}>查看详情</button>
        {status === 'running' && <button onClick={onPause} className={styles.btnWarning}>暂停</button>}
        {status === 'paused' && <button onClick={onResume} className={styles.btnSuccess}>恢复</button>}
      </div>
    </div>
  )
}
