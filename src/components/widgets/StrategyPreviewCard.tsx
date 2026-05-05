'use client'
import { useState } from 'react'
import styles from './widgets.module.css'

const ASSET_LOGOS: Record<string, string> = {
  BTC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  HYPE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
}

interface StrategyPreviewCardProps {
  strategyName?: string
  description?: string
  totalInvestment?: number
  selectedAssets?: string[]
  rebalanceFrequency?: string
  historicalApy?: { min: number; max: number }
  maxDrawdown?: { min: number; max: number }
  fundingRateThreshold?: number
  spotPerpRatio?: string
  settlementFrequency?: string
  onConfirm?: () => void
  onCancel?: () => void
  onEdit?: () => void
  loading?: boolean
  showRiskAcknowledgement?: boolean
}

export function StrategyPreviewCard({
  strategyName = 'Funding Harvester',
  description = '通过现货+反向合约对冲，赚取资金费率收益',
  totalInvestment = 2500,
  selectedAssets = ['BTC', 'ETH'],
  rebalanceFrequency = '每8小时',
  historicalApy = { min: 15, max: 55 },
  maxDrawdown = { min: 2, max: 5 },
  fundingRateThreshold = 0.01,
  spotPerpRatio = '1:1',
  settlementFrequency = '每8小时',
  onConfirm = () => {}, onCancel = () => {}, onEdit = () => {},
  loading = false, showRiskAcknowledgement = false,
}: StrategyPreviewCardProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const canConfirm = !showRiskAcknowledgement || acknowledged

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.strategyHeader}>
        <div style={{ flex: 1 }}>
          <div className={styles.cardSubtitle}>AI 推荐策略</div>
          <div className={styles.strategyTitle}>{strategyName}</div>
          <div className={styles.strategyDesc}>{description}</div>
        </div>
        <button onClick={onCancel} className={styles.closeBtnWhite}>×</button>
      </div>

      {/* APY Stats */}
      <div className={styles.strategyStats}>
        <div className={styles.strategyStat}>
          <div className={styles.strategyStatLabel}>历史年化收益</div>
          <div className={styles.strategyStatValue} style={{ color: 'var(--success)' }}>
            {historicalApy.min}% - {historicalApy.max}%
          </div>
          <div className={styles.strategyStatNote}>取决于资金费率水平</div>
        </div>
        <div className={styles.strategyStat}>
          <div className={styles.strategyStatLabel}>历史最大回撤</div>
          <div className={styles.strategyStatValue} style={{ color: 'var(--warning)' }}>
            {maxDrawdown.min}% - {maxDrawdown.max}%
          </div>
          <div className={styles.strategyStatNote}>价格对冲，风险较低</div>
        </div>
      </div>

      {/* Config */}
      <div className={styles.cardBody}>
        <div className={styles.rowBetween}>
          <span className={styles.label}>策略配置</span>
          <button onClick={onEdit} className={styles.editBtn}>编辑</button>
        </div>
        <div className={styles.strategyConfig}>
          <ConfigRow k="总投入" v={`$${totalInvestment.toLocaleString()} USDC`} mono bold />
          <ConfigRow k="目标资产" v="">
            <div className={styles.assetTags}>
              {selectedAssets.map(a => (
                <div key={a} className={styles.assetTag}>
                  <img src={ASSET_LOGOS[a]} alt={a} width={16} height={16} />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </ConfigRow>
          <ConfigRow k="费率阈值" v={`≥${(fundingRateThreshold * 100).toFixed(2)}%`} mono />
          <ConfigRow k="持仓配置" v={`现货:合约 ${spotPerpRatio}`} />
          <ConfigRow k="结算周期" v={settlementFrequency} />
          <ConfigRow k="再平衡频率" v={rebalanceFrequency} />
        </div>

        {/* Strategy Principle */}
        <button onClick={() => setDetailsOpen(v => !v)} className={styles.detailToggle}>
          {detailsOpen ? '▲' : '▼'} 查看策略原理
        </button>
        {detailsOpen && (
          <div className={styles.strategyDetail}>
            <p>Funding Harvester（资金费率套利）核心逻辑：</p>
            <ul>
              <li>当永续合约资金费率为正时，多头付费给空头</li>
              <li>策略持有现货多头 + 永续合约空头，实现 delta 中性</li>
              <li>通过收取资金费率获利，每8小时结算一次</li>
              <li>价格波动对冲，收益主要来自费率而非方向</li>
            </ul>
          </div>
        )}

        {/* Risk Acknowledgement */}
        {showRiskAcknowledgement && (
          <div className={styles.riskAck}>
            <div className={styles.riskAckText}>
              ⚠️ 自动化策略会在您不在线时持续交易，资金费率可能为负，策略亦可能亏损。请确认您了解相关风险。
            </div>
            <label className={styles.riskAckCheck}>
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
              <span>我已了解风险并愿意承担</span>
            </label>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        <button onClick={onCancel} disabled={loading} className={styles.btnSecondary}>取消</button>
        <button onClick={onConfirm} disabled={loading || !canConfirm} className={styles.btnPrimary}
          style={{ background: (!canConfirm || loading) ? 'var(--surface-secondary)' : 'var(--brand-primary)', cursor: (!canConfirm || loading) ? 'not-allowed' : 'pointer' }}>
          {loading ? '启动中...' : '确认并授权 Agent 自动建仓'}
        </button>
      </div>
    </div>
  )
}

function ConfigRow({ k, v, mono, bold, children }: { k: string; v: string; mono?: boolean; bold?: boolean; children?: React.ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{k}</span>
      {children ?? (
        <span style={{
          fontSize: bold ? 'var(--text-lg)' : 'var(--text-base)',
          fontWeight: bold ? 'var(--weight-bold)' : 'var(--weight-semibold)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
          color: 'var(--text-primary)',
        }}>{v}</span>
      )}
    </div>
  )
}
