'use client'
import styles from './widgets.module.css'

interface OrderPreviewCardProps {
  platform?: string
  marketType?: 'perp' | 'spot'
  action?: 'open_long' | 'open_short' | 'close' | 'buy' | 'sell'
  asset?: string
  orderType?: 'market' | 'limit'
  sizeUsd?: number
  leverage?: number
  limitPrice?: number | null
  tpPercent?: number | null
  slPercent?: number | null
  estimatedQty?: number
  estimatedFee?: number
  estimatedLiquidationPrice?: number | null
  accountBalance?: number
  currentPrice?: number
  onConfirm?: (details: any) => void
  onCancel?: () => void
  loading?: boolean
}

export function OrderPreviewCard({
  platform = 'Hyperliquid', marketType = 'perp', action = 'open_long',
  asset = 'ETH', orderType = 'market', sizeUsd = 500, leverage = 2,
  limitPrice = null, tpPercent = null, slPercent = null,
  estimatedQty = 0.4, estimatedFee = 1.25, estimatedLiquidationPrice = null,
  accountBalance = 3200, currentPrice = 2500,
  onConfirm = () => {}, onCancel = () => {}, loading = false,
}: OrderPreviewCardProps) {
  const notional = marketType === 'perp' ? sizeUsd * leverage : sizeUsd
  const actionLabel = marketType === 'spot' ? (action === 'buy' ? '买入' : '卖出')
    : action === 'open_long' ? '开多' : action === 'open_short' ? '开空' : '平仓'
  const actionColor = (action.includes('long') || action === 'buy') ? 'var(--success)'
    : (action.includes('short') || action === 'sell') ? 'var(--danger)' : 'var(--brand-primary)'
  const noSl = !slPercent
  const highLev = leverage > 5

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardSubtitle}>{platform}</div>
          <div className={styles.cardTitle}>
            订单预览
            <span className={styles.marketBadge} style={marketType === 'perp' ? { background: 'var(--surface-accent)', color: 'var(--brand-primary)' } : { background: 'var(--success-light)', color: 'var(--success)' }}>
              {marketType === 'perp' ? '永续合约' : '现货'}
            </span>
          </div>
        </div>
        <button onClick={onCancel} className={styles.closeBtn}>×</button>
      </div>

      {/* Action Block */}
      <div className={styles.cardBody}>
        <div className={styles.actionBlock} style={{ background: `${actionColor}08`, border: `1px solid ${actionColor}20` }}>
          <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', color: actionColor }}>{actionLabel}</span>
          <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>{asset}</span>
        </div>

        {/* Details */}
        <div className={styles.detailsGrid}>
          <Row k="订单类型" v={orderType === 'market' ? '市价单' : `限价单 @ $${limitPrice?.toLocaleString()}`} />
          <Row k="投入金额" v={`$${sizeUsd.toLocaleString()} USDC`} mono bold />
          {marketType === 'perp' && <>
            <Row k="杠杆倍数" v={`${leverage}x`} highlight={leverage > 3 ? 'warning' : undefined} />
            <Row k="名义仓位" v={`$${notional.toLocaleString()}`} mono bold />
          </>}
          <Row k="预估数量" v={`${estimatedQty} ${asset}`} mono />
          {(tpPercent || slPercent) && (
            <div className={styles.tpslRow}>
              {tpPercent && <span style={{ color: 'var(--success)', fontSize: 'var(--text-xs)' }}>📈 止盈: +{tpPercent}%</span>}
              {slPercent && <span style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>📉 止损: -{slPercent}%</span>}
            </div>
          )}
          <div className={styles.divider} />
          <Row k="预估手续费" v={`$${estimatedFee}`} mono />
          {marketType === 'perp' && estimatedLiquidationPrice && (
            <Row k="强平价格" v={`$${estimatedLiquidationPrice.toLocaleString()}`} mono bold danger />
          )}
          <Row k="账户余额" v={`$${accountBalance.toLocaleString()} USDC`} mono />
        </div>

        {/* Warnings */}
        {(noSl || highLev) && (
          <div className={styles.warningBox} style={highLev ? { background: 'var(--danger-light)' } : { background: 'var(--warning-light)' }}>
            <div className={styles.warningTitle}>{highLev ? '⚠️ 高杠杆风险' : '⚠️ 未设置止损'}</div>
            <div className={styles.warningText}>
              {highLev ? `${leverage}x 杠杆下，市场小幅波动即可能触发强平，请谨慎操作。`
                : '建议设置止损以控制风险。未设置止损可能导致亏损扩大。'}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.cardFooter}>
        <button onClick={onCancel} disabled={loading} className={styles.btnSecondary}>取消</button>
        <button onClick={() => onConfirm({ marketType, action, asset, orderType, sizeUsd, leverage, limitPrice, tpPercent, slPercent, currentPrice })} disabled={loading} className={styles.btnPrimary}
          style={{ background: loading ? 'var(--surface-secondary)' : actionColor }}>
          {loading ? '处理中...' : `确认${actionLabel}`}
        </button>
      </div>
    </div>
  )
}

function Row({ k, v, mono, bold, highlight, danger }: { k: string; v: string; mono?: boolean; bold?: boolean; highlight?: 'warning'; danger?: boolean }) {
  return (
    <div className={styles.detailRow}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{k}</span>
      <span style={{
        fontSize: bold ? 'var(--text-lg)' : 'var(--text-base)',
        fontWeight: bold ? 'var(--weight-bold)' : 'var(--weight-semibold)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        color: danger ? 'var(--danger)' : highlight === 'warning' ? 'var(--warning)' : 'var(--text-primary)',
      }}>{v}</span>
    </div>
  )
}
