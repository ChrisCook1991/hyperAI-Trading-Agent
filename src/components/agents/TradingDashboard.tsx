'use client'
import { TradingTaskCard, type TradingTask, type StrategyStatus } from './TradingTaskCard'
import styles from './agents.module.css'

interface TradingDashboardProps {
  tasks: TradingTask[]
  onStatusChange: (id: string, status: StrategyStatus) => void
}

export function TradingDashboard({ tasks, onStatusChange }: TradingDashboardProps) {
  const activeCnt = tasks.filter(t => t.status === 'active').length

  return (
    <div className={styles.dashSection}>
      <div className={styles.dashHeader}>
        <div>
          <h2 className={styles.dashTitle}>Active Trading Tasks</h2>
          <p className={styles.dashSubtitle}>
            Agent is managing {activeCnt} active position{activeCnt !== 1 ? 's' : ''}
          </p>
        </div>
        <button className={styles.btnViewAll}>View All</button>
      </div>

      {tasks.map(task => (
        <TradingTaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
      ))}
    </div>
  )
}
