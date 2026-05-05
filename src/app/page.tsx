'use client'
import { useState, useCallback } from 'react'
import { AgentChatPanel } from '@/components/agents/AgentChatPanel'
import { TradingDashboard } from '@/components/agents/TradingDashboard'
import { type TradingTask, type StrategyStatus } from '@/components/agents/TradingTaskCard'
import styles from '@/components/agents/agents.module.css'

// Issue 4: Funding Harvester task added only after strategy is deployed
const FUNDING_HARVESTER_TASK: TradingTask = {
  id: 'FH-001', type: 'funding_harvester',
  name: 'Funding Harvester',
  desc: 'ETH + BTC delta-neutral, collecting funding',
  icon: '💰', status: 'active', progress: 78,
  metrics: [
    { label: 'Total Investment', value: '$2,500' },
    { label: 'Current Equity', value: '$2,672.30' },
    { label: 'APY (Realized)', value: '+32.4%', positive: true },
    { label: 'Funding Collected', value: '$172.30' },
  ],
}

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home' },
  { icon: '📊', label: 'Portfolio' },
  { icon: '📈', label: 'Trading' },
  { icon: '🤖', label: 'My Agents', active: true },
]
const NAV_FOOTER = [
  { icon: '⚙️', label: 'Settings' },
  { icon: '❓', label: 'Help' },
]

export default function AgentsPage() {
  const [chatOpen, setChatOpen] = useState(false)
  // Issue 4: Start empty — tasks only appear after agent conversation completes
  const [tasks, setTasks] = useState<TradingTask[]>([])

  // Called by AgentChatPanel when strategy.confirm fires
  const handleStrategyDeployed = useCallback(() => {
    setTasks(prev => {
      if (prev.find(t => t.id === 'FH-001')) return prev // don't add twice
      return [...prev, { ...FUNDING_HARVESTER_TASK, status: 'active' }]
    })
  }, [])

  // Called when chat triggers pause/stop on a running strategy
  const handleStrategyAction = useCallback((action: 'pause' | 'stop' | 'resume', strategyId?: string) => {
    const id = strategyId || 'FH-001'
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      if (action === 'pause') return { ...t, status: 'paused' }
      if (action === 'resume') return { ...t, status: 'active' }
      if (action === 'stop') return { ...t, status: 'stopped', progress: 100 }
      return t
    }))
  }, [])

  const handleTaskStatusChange = useCallback((id: string, status: StrategyStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }, [])

  return (
    <div className={styles.pageRoot}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M6 6V4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <rect x="15" y="14" width="5" height="3" rx="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Wallet</div>
            <div className={styles.brandSub}>Your secure vault</div>
          </div>
        </div>
        <nav className={styles.navSection}>
          {NAV_ITEMS.map(item => (
            <div key={item.label} className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}>
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          {NAV_FOOTER.map(item => (
            <div key={item.label} className={styles.navItem}>
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </div>
          ))}
          <div className={`${styles.navItem} ${styles.navItemDanger}`}>
            <span className={styles.navIcon}>→</span>
            Log Out
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className={styles.mainContent}>
        <h1 className={styles.pageTitle}>My Agents</h1>
        <p className={styles.pageSubtitle}>AI-powered automated trading assistant</p>

        {/* Agent intro card — shows Start button when chat is closed */}
        {!chatOpen && (
          <div className={styles.agentCard}>
            <div className={styles.agentCardHeader}>
              <div className={styles.agentAvatar}>✨</div>
              <div style={{ flex: 1 }}>
                <h2 className={styles.agentCardTitle}>HyperAI Trading Assistant</h2>
                <p className={styles.agentCardDesc}>
                  👋 Hi! I&apos;m your AI trading assistant. I can help you create automated trading strategies
                  like Funding Harvester, DCA schedules, and smart limit orders.
                  Let&apos;s start a secure conversation!
                </p>
                <button className={styles.btnStartConvo} onClick={() => setChatOpen(true)}>
                  💬 Start Secure Conversation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Embedded chat panel — secure screen is INSIDE this panel (fix 1) */}
        {chatOpen && (
          <AgentChatPanel
            hasActiveStrategy={tasks.length > 0}
            onStrategyAction={handleStrategyAction}
            onStrategyDeployed={handleStrategyDeployed}
            onClose={() => setChatOpen(false)}
          />
        )}

        {/* Issue 4: Dashboard only renders when tasks exist */}
        {tasks.length > 0 && (
          <TradingDashboard tasks={tasks} onStatusChange={handleTaskStatusChange} />
        )}

        {/* Empty state hint when no strategies deployed yet */}
        {tasks.length === 0 && (
          <div className={styles.dashSection}>
            <div className={styles.dashHeader}>
              <div>
                <h2 className={styles.dashTitle}>Active Trading Tasks</h2>
                <p className={styles.dashSubtitle}>No active strategies yet</p>
              </div>
            </div>
            <div style={{
              background: 'var(--surface-card)',
              border: '1.5px dashed var(--border-medium)',
              borderRadius: 16,
              padding: '48px 32px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>No active strategies</div>
              <div style={{ fontSize: 13 }}>
                Start a conversation with HyperAI to set up your first automated trading strategy.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
