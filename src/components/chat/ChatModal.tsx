'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { callAI, resetSession, type AIResponse, type RenderWidget } from '@/lib/ai-agent'
import { SpecRenderer, buildSpecFromWidget } from '@/lib/spec-renderer'
import { registerHandlers } from '@/lib/event-handler'
import { ExecutionProgress } from '@/components/widgets/ExecutionProgress'
import styles from './chat.module.css'

interface Message {
  id: string
  role: 'user' | 'ai' | 'widget' | 'exec'
  content?: string
  widget?: RenderWidget
  specJson?: unknown
  execId?: string  // exec 消息对应的 execState key
}

interface ExecState {
  steps: Array<{ label: string; description?: string }>
  current: number
  status: 'processing' | 'success' | 'error'
}

export function ChatModal() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // Map from execId → ExecState (allows multiple exec progresses independently)
  const [execMap, setExecMap] = useState<Record<string, ExecState>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const history = useRef<Array<{ role: string; content: string }>>([])

  const uid = () => Math.random().toString(36).slice(2)

  // Shared "send text to AI and render response" helper
  const sendToAI = useCallback(async (text: string, isUserVisible = true) => {
    if (isUserVisible) {
      setMessages(prev => [...prev, { id: uid(), role: 'user', content: text }])
    }
    history.current.push({ role: 'user', content: text })
    setLoading(true)
    try {
      const res: AIResponse = await callAI(text, history.current)
      history.current.push({ role: 'assistant', content: res.text })
      setMessages(prev => [...prev, { id: uid(), role: 'ai', content: res.text }])
      if (res.render_widget) {
        setMessages(prev => [...prev, {
          id: uid(), role: 'widget',
          widget: res.render_widget,
          specJson: buildSpecFromWidgetWithEvents(res.render_widget!),
        }])
      }
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '⚠️ 网络错误，请稍后重试。' }])
    } finally {
      setLoading(false)
    }
  }, [])

  // Build spec and inject onSubmit for AmountInput
  const buildSpecFromWidgetWithEvents = (rw: RenderWidget) => {
    const spec = buildSpecFromWidget(rw)
    // For AmountInput, inject onSubmit event so users can click the button directly
    if (rw.widget_name === 'AmountInput') {
      const el = spec.elements['root_widget']
      el.events = { ...el.events, onSubmit: 'amount.submit' }
    }
    return spec
  }

  // Run execution steps with a unique execId
  const runExecution = useCallback((steps: Array<{ label: string; description?: string }>, successMsg?: string) => {
    const execId = uid()
    const msgId = uid()
    setMessages(prev => [...prev, { id: msgId, role: 'exec', execId }])
    setExecMap(prev => ({ ...prev, [execId]: { steps, current: 0, status: 'processing' } }))
    let i = 0
    const tick = setInterval(() => {
      i++
      if (i >= steps.length) {
        clearInterval(tick)
        setExecMap(prev => ({ ...prev, [execId]: { ...prev[execId], current: i, status: 'success' } }))
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: uid(), role: 'ai',
            content: successMsg || '✅ 执行完成！',
          }])
        }, 800)
      } else {
        setExecMap(prev => ({ ...prev, [execId]: { ...prev[execId], current: i } }))
      }
    }, 1200)
  }, [])

  // Register all event handlers
  useEffect(() => {
    registerHandlers({
      // ── Order ──────────────────────────────────────────────
      'order.confirm': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'OrderPreviewCard'))
        runExecution(
          [
            { label: '正在提交订单...', description: '连接 Hyperliquid API' },
            { label: '订单已提交', description: '等待成交确认' },
            { label: '✅ 已成交', description: '0.4 ETH @ $2,498.50' },
          ],
          '✅ 执行完成！订单已提交至 Hyperliquid，请在仓位面板查看详情。'
        )
      },
      'order.cancel': () => {
        setMessages(prev => [
          ...prev.filter(m => m.widget?.widget_name !== 'OrderPreviewCard'),
          { id: uid(), role: 'ai', content: '好的，已取消订单。如需重新下单，随时告诉我。' },
        ])
      },

      // ── Strategy ───────────────────────────────────────────
      'strategy.confirm': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'StrategyPreviewCard'))
        runExecution(
          [
            { label: '正在配置 Agent Wallet...', description: '检查授权状态' },
            { label: 'Agent Wallet 配置完成', description: '✅' },
            { label: '正在保存策略...', description: '通过 IPC 下发至 Veta 引擎' },
            { label: '✅ 策略已启动', description: 'Funding Harvester 开始运行' },
          ],
          '✅ Funding Harvester 策略已成功启动！Agent 将在资金费率满足条件时自动建仓。'
        )
      },
      'strategy.cancel': () => {
        setMessages(prev => [
          ...prev.filter(m => m.widget?.widget_name !== 'StrategyPreviewCard'),
          { id: uid(), role: 'ai', content: '好的，已取消策略配置。如需重新配置，随时告诉我。' },
        ])
      },
      'strategy.edit': () => {
        // Remove the current StrategyPreviewCard from the message list
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'StrategyPreviewCard'))
        // Show a user bubble so the conversation flow is visible
        setMessages(prev => [...prev, { id: uid(), role: 'user', content: '我想修改策略配置' }])
        // Use internal trigger so ai-agent reliably restarts the questionnaire
        sendToAI('__STRATEGY_EDIT__', false)
      },

      // ── Strategy Status ────────────────────────────────────
      'strategy.pause': () => {
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '⏸️ 策略已暂停。仓位将保留，不再执行新操作。随时可以恢复。' }])
      },
      'strategy.details': () => {
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '📊 策略详情可在"策略管理面板"查看。' }])
      },

      // ── Amount Input submit ─────────────────────────────────
      // Fired when user clicks "确认金额" button directly in the AmountInput widget
      'amount.submit': (amount: string) => {
        if (!amount) return
        // Remove the AmountInput widget from messages
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'AmountInput'))
        // Send the amount as the user's reply (visible)
        sendToAI(amount, true)
      },

      // ── Questionnaire selector submits ─────────────────────
      // Fired when user clicks confirm in RiskPreferenceSelector or ReturnRateSelector
      'questionnaire.submit': (selected: string) => {
        if (!selected) return
        const labelMap: Record<string, string> = {
          conservative: '保守型', balanced: '稳健型', aggressive: '进取型',
          low: '5%-12% 稳健收益', medium: '12%-18% 平衡收益',
          high: '18%-25% 积极收益', vhigh: '25%+ 高收益',
        }
        const displayText = labelMap[selected] || selected
        // 1. Remove selector widget
        setMessages(prev => prev.filter(m =>
          m.widget?.widget_name !== 'RiskPreferenceSelector' &&
          m.widget?.widget_name !== 'ReturnRateSelector'
        ))
        // 2. Add user bubble with friendly label (before sendToAI to avoid race)
        const userMsgId = uid()
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: displayText }])
        // 3. Send raw value to AI (no visible bubble from sendToAI)
        sendToAI(selected, false)
      },

      // Fired when user clicks confirm/skip in AssetMultiSelect
      'questionnaire.assets.submit': (assets: string[]) => {
        const displayText = assets.length > 0 ? `资产偏好：${assets.join(', ')}` : '资产偏好：由 AI 推荐'
        const sendValue = assets.length > 0 ? assets.join(' ') : '跳过'
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'AssetMultiSelect'))
        setMessages(prev => [...prev, { id: uid(), role: 'user', content: displayText }])
        sendToAI(sendValue, false)
      },
    })
  }, [runExecution, sendToAI])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, execMap])

  const handleOpen = () => {
    setOpen(true)
    if (messages.length === 0) {
      setMessages([{
        id: uid(), role: 'ai',
        content: '👋 你好！我是 HyperAI，你的 Hyperliquid 智能交易助手。\n\n你可以直接告诉我：\n• "帮我在 Hyperliquid 开一笔 ETH 2x 限价单，开单价 2500，TP 15%，SL 5%"\n• "帮我推荐一个稳定收益策略"\n• "我的策略状态怎么样"',
      }])
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleClose = () => setOpen(false)

  const handleNewSession = () => {
    setMessages([])
    setExecMap({})
    resetSession()
    history.current = []
    setMessages([{ id: uid(), role: 'ai', content: '新对话已开始 👋 有什么我可以帮你的？' }])
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendToAI(text, true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const QUICK_PROMPTS = [
    { label: '📊 开 ETH 多单', text: '帮我在 Hyperliquid 开一笔 ETH 2x 的现价单，开单价 2500，TP 15%，SL 5%' },
    { label: '🤖 推荐稳定策略', text: '帮我推荐一个稳定收益策略' },
    { label: '📈 查策略状态', text: '我的策略状态怎么样' },
    { label: '💹 ETH 价格', text: 'ETH 现在多少钱' },
  ]

  return (
    <>
      {/* Floating Button */}
      <button className={styles.fab} onClick={open ? handleClose : handleOpen} aria-label="AI Trading Agent">
        {open ? '✕' : (
          <span className={styles.fabInner}>
            <span className={styles.fabIcon}>🤖</span>
            <span className={styles.fabText}>HyperAI</span>
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className={styles.modal}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.agentInfo}>
              <div className={styles.agentAvatar}>🤖</div>
              <div>
                <div className={styles.agentName}>HyperAI Agent</div>
                <div className={styles.agentStatus}><span className={styles.statusDot} />Hyperliquid · Mock 模式</div>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button onClick={handleNewSession} className={styles.iconBtn} title="新对话">↺</button>
              <button onClick={handleClose} className={styles.iconBtn} title="关闭">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map(msg => (
              <MessageItem key={msg.id} msg={msg} execMap={execMap} />
            ))}
            {loading && (
              <div className={styles.aiMsg}>
                <div className={styles.avatar}>🤖</div>
                <div className={styles.typingBubble}>
                  <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className={styles.quickPrompts}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setInput(p.text); inputRef.current?.focus() }}
                  className={styles.quickBtn}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className={styles.inputArea}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="发消息给 HyperAI... (Enter 发送)"
              rows={1}
              className={styles.textarea}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className={styles.sendBtn}>
              {loading ? <span className={styles.sendSpinner} /> : '↑'}
            </button>
          </div>
          <div className={styles.disclaimer}>AI 不构成投资建议 · GenUI 渲染架构演示</div>
        </div>
      )}

      {/* Overlay */}
      {open && <div className={styles.overlay} onClick={handleClose} />}
    </>
  )
}

function MessageItem({ msg, execMap }: { msg: Message; execMap: Record<string, ExecState> }) {
  if (msg.role === 'user') {
    return (
      <div className={styles.userMsg}>
        <div className={styles.userBubble}>{msg.content}</div>
      </div>
    )
  }
  if (msg.role === 'ai') {
    return (
      <div className={styles.aiMsg}>
        <div className={styles.avatar}>🤖</div>
        <div className={styles.aiBubble}>
          <MarkdownText text={msg.content || ''} />
        </div>
      </div>
    )
  }
  if (msg.role === 'exec' && msg.execId) {
    const exec = execMap[msg.execId]
    if (!exec) return null
    return (
      <div className={styles.widgetMsg}>
        <ExecutionProgress steps={exec.steps} currentStep={exec.current} status={exec.status} />
      </div>
    )
  }
  if (msg.role === 'widget') {
    if (!msg.specJson) return null
    return (
      <div className={styles.widgetMsg}>
        <SpecRenderer spec={msg.specJson} onValidationError={e => console.error('[Spec]', e)} />
      </div>
    )
  }
  return null
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
        if (line.startsWith('•') || line.startsWith('-')) {
          return <div key={i} style={{ paddingLeft: '12px', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: '· ' + formatted.slice(1).trim() }} />
        }
        return <div key={i} style={{ marginBottom: line ? '4px' : '8px' }} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
      })}
    </div>
  )
}
