'use client'
import { useState } from 'react'
import styles from './agents.module.css'

export type StrategyStatus = 'active' | 'paused' | 'stopped'

export interface TradingTask {
  id: string
  type: 'copy_trading' | 'dca' | 'funding_harvester'
  name: string
  desc: string
  icon: string
  status: StrategyStatus
  progress: number
  metrics: Array<{ label: string; value: string; positive?: boolean; negative?: boolean }>
}

interface ConfirmState {
  taskId: string
  action: 'pause' | 'resume' | 'stop' | 'close'
  title: string
  desc: string
  warning?: string
  okLabel: string
  okDanger?: boolean
}

interface TradingTaskCardProps {
  task: TradingTask
  onStatusChange: (id: string, status: StrategyStatus) => void
}

export function TradingTaskCard({ task, onStatusChange }: TradingTaskCardProps) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const requestPause = () => setConfirm({
    taskId: task.id, action: 'pause',
    title: '暂停策略',
    desc: `确定要暂停「${task.name}」吗？`,
    warning: '⚠️ 暂停后：仓位将保留，不再执行新操作。资金费率仍会继续产生盈亏。',
    okLabel: '确认暂停', okDanger: false,
  })

  const requestResume = () => {
    onStatusChange(task.id, 'active')
  }

  const requestStop = () => setConfirm({
    taskId: task.id, action: 'stop',
    title: '停止并平仓',
    desc: `确定要停止「${task.name}」并平掉所有仓位吗？`,
    warning: '⚠️ 停止后将立即市价平仓，可能产生滑点损失，操作不可撤销。',
    okLabel: '确认停止平仓', okDanger: true,
  })

  const handleConfirm = () => {
    if (!confirm) return
    if (confirm.action === 'pause') onStatusChange(task.id, 'paused')
    if (confirm.action === 'stop') onStatusChange(task.id, 'stopped')
    setConfirm(null)
  }

  const statusClass = {
    active: styles.statusActive,
    paused: styles.statusPaused,
    stopped: styles.statusStopped,
  }[task.status]

  const statusLabel = { active: 'Active', paused: 'Paused', stopped: 'Stopped' }[task.status]

  return (
    <>
      <div className={`${styles.taskCard} ${task.status !== 'active' ? styles.paused : ''}`}>
        {/* Top row */}
        <div className={styles.taskCardTop}>
          <div className={styles.taskInfo}>
            <div className={styles.taskIcon}>{task.icon}</div>
            <div>
              <div className={styles.taskName}>{task.name}</div>
              <div className={styles.taskDesc}>{task.desc}</div>
            </div>
          </div>
          <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
        </div>

        {/* Metrics */}
        <div className={styles.taskMetrics}>
          {task.metrics.map(m => (
            <div key={m.label}>
              <div className={styles.metricLabel}>{m.label}</div>
              <div className={`${styles.metricValue} ${m.positive ? styles.metricValuePos : m.negative ? styles.metricValueNeg : ''}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className={styles.taskProgress}>
          <div className={styles.progressLabel}>
            <span>Task Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${task.progress}%` }} />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.taskActions}>
          {task.status === 'active' && (
            <button onClick={requestPause} className={styles.btnTaskAction}>
              ⏸ Pause
            </button>
          )}
          {task.status === 'paused' && (
            <button onClick={requestResume} className={`${styles.btnTaskAction} ${styles.btnTaskPrimary}`}>
              ▶ Resume
            </button>
          )}
          <button className={styles.btnTaskAction} onClick={() => {}}>
            View Details
          </button>
          {task.status !== 'stopped' && (
            <button onClick={requestStop} className={`${styles.btnTaskAction} ${styles.btnTaskClose}`}>
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Confirm overlay */}
      {confirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>
              {confirm.okDanger ? '⚠️' : '⏸️'}
            </div>
            <div className={styles.confirmTitle}>{confirm.title}</div>
            <div className={styles.confirmDesc}>{confirm.desc}</div>
            {confirm.warning && (
              <div className={styles.confirmWarning}>{confirm.warning}</div>
            )}
            <div className={styles.confirmBtns}>
              <button className={styles.btnConfirmCancel} onClick={() => setConfirm(null)}>取消</button>
              <button
                className={`${styles.btnConfirmOk} ${!confirm.okDanger ? styles.btnConfirmOkBlue : ''}`}
                onClick={handleConfirm}
              >
                {confirm.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
