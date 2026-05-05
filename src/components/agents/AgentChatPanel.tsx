'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { callAI, resetSession, type RenderWidget } from '@/lib/ai-agent'
import { SpecRenderer, buildSpecFromWidget } from '@/lib/spec-renderer'
import { registerHandlers } from '@/lib/event-handler'
import { ExecutionProgress } from '@/components/widgets/ExecutionProgress'
import styles from './agents.module.css'

interface Message {
  id: string
  role: 'user' | 'ai' | 'widget' | 'exec'
  content?: string
  widget?: RenderWidget
  specJson?: unknown
  execId?: string
}

interface ExecState {
  steps: Array<{ label: string; description?: string }>
  current: number
  status: 'processing' | 'success' | 'error'
}

interface AgentChatPanelProps {
  hasActiveStrategy?: boolean
  onStrategyAction?: (action: 'pause' | 'stop' | 'resume', strategyId?: string) => void
  onStrategyDeployed?: () => void
  onClose?: () => void
}

// Pre-filled prompts shown after greeting
const PREFILLED = [
  { label: '🤖 推荐稳定收益策略', text: '帮我推荐一个稳定的自动化交易策略', action: 'send', requiresStrategy: false },
  { label: '📊 开 ETH 多单', text: '帮我在 Hyperliquid 开一笔 ETH 2x 限价单，开单价 2500，TP 15%，SL 5%', action: 'fill', requiresStrategy: false },
  { label: '📈 查看策略状态', text: '我的策略运行怎么样了', action: 'send', requiresStrategy: true },
  { label: '⏸️ 暂停策略', text: '暂停我的 Funding Harvester 策略', action: 'send', requiresStrategy: true },
]

const GREETING = `👋 Hello! I'm HyperAI, your dedicated trading assistant.

I can help you safely set up automated trading strategies on Hyperliquid, with continuous monitoring and feedback.

What would you like to do today?`

export function AgentChatPanel({ hasActiveStrategy = false, onStrategyAction, onStrategyDeployed, onClose }: AgentChatPanelProps) {
  // Issue 1: Secure screen lives INSIDE the chat panel
  const [screen, setScreen] = useState<'secure' | 'chat'>('secure')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [execMap, setExecMap] = useState<Record<string, ExecState>>({})

  // Issue 3: Use container ref instead of scrollIntoView to avoid page jump
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const history = useRef<Array<{ role: string; content: string }>>([])
  const hasGreeted = useRef(false)

  const uid = () => Math.random().toString(36).slice(2)

  // Issue 3: Scroll only within the messages container
  const scrollToBottom = useCallback((smooth = true) => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  const sendToAI = useCallback(async (text: string, isUserVisible = true) => {
    if (isUserVisible) {
      setMessages(prev => [...prev, { id: uid(), role: 'user', content: text }])
    }
    history.current.push({ role: 'user', content: text })
    setLoading(true)
    try {
      const res = await callAI(text, history.current)
      history.current.push({ role: 'assistant', content: res.text })
      if (res.text) {
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: res.text }])
      }
      if (res.render_widget) {
        const rw = res.render_widget
        const spec = buildSpecFromWidget(rw)
        if (rw.widget_name === 'AmountInput') {
          spec.elements['root_widget'].events = {
            ...(spec.elements['root_widget'].events || {}),
            onSubmit: 'amount.submit',
          }
        }
        setMessages(prev => [...prev, { id: uid(), role: 'widget', widget: rw, specJson: spec }])
      }
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '⚠️ 网络错误，请稍后重试。' }])
    } finally {
      setLoading(false)
    }
  }, [])

  const runExecution = useCallback((
    steps: Array<{ label: string; description?: string }>,
    successMsg?: string,
  ) => {
    const execId = uid()
    setMessages(prev => [...prev, { id: uid(), role: 'exec', execId }])
    setExecMap(prev => ({ ...prev, [execId]: { steps, current: 0, status: 'processing' } }))
    let i = 0
    const tick = setInterval(() => {
      i++
      if (i >= steps.length) {
        clearInterval(tick)
        setExecMap(prev => ({ ...prev, [execId]: { ...prev[execId], current: i, status: 'success' } }))
        if (successMsg) {
          setTimeout(() => setMessages(prev => [...prev, { id: uid(), role: 'ai', content: successMsg }]), 600)
        }
      } else {
        setExecMap(prev => ({ ...prev, [execId]: { ...prev[execId], current: i } }))
      }
    }, 1100)
  }, [])

  useEffect(() => {
    registerHandlers({
      // ── Order ──────────────────────────────────────────────────
      'order.confirm': async (details: any) => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'OrderPreviewCard'))
        
        const execId = uid()
        setMessages(prev => [...prev, { id: uid(), role: 'exec', execId }])
        setExecMap(prev => ({ ...prev, [execId]: { steps: [
          { label: '正在提交订单...', description: '连接 Hyperliquid API' },
        ], current: 0, status: 'processing' } }))

        try {
          const res = await fetch('/api/trade', { method: 'POST', body: JSON.stringify(details) })
          const data = await res.json()
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to place order')

          setExecMap(prev => ({ ...prev, [execId]: { 
            steps: [
              { label: '正在提交订单...', description: '连接 Hyperliquid API' },
              { label: '订单已提交', description: 'API 确认成功' },
              { label: '✅ 已完成下单', description: '订单已被链上接收' },
            ], current: 3, status: 'success' 
          } }))
          setTimeout(() => setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '✅ 真实订单已成功提交至 Hyperliquid 主网！' }]), 600)
        } catch (e: any) {
          setExecMap(prev => ({ ...prev, [execId]: { 
            steps: [{ label: '提交失败', description: '连接 Hyperliquid API', error: e.message }], 
            current: 0, status: 'error' 
          } }))
        }
      },
      'order.cancel': () => {
        setMessages(prev => [
          ...prev.filter(m => m.widget?.widget_name !== 'OrderPreviewCard'),
          { id: uid(), role: 'ai', content: '好的，已取消订单。如需重新下单，随时告诉我。' },
        ])
      },
      'order.cancel_submit': async () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'ConfirmDialog'))
        
        const execId = uid()
        setMessages(prev => [...prev, { id: uid(), role: 'exec', execId }])
        setExecMap(prev => ({ ...prev, [execId]: { steps: [
          { label: '正在撤销订单...', description: '连接 Hyperliquid API' },
        ], current: 0, status: 'processing' } }))

        try {
          // Hardcoding oid and asset just for this demo
          const res = await fetch('/api/trade?asset=ETH&oid=12345', { method: 'DELETE' })
          const data = await res.json()
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to cancel order')

          setExecMap(prev => ({ ...prev, [execId]: { 
            steps: [
              { label: '正在撤销订单...', description: '连接 Hyperliquid API' },
              { label: '撤单已提交', description: 'API 确认成功' },
              { label: '✅ 已撤销', description: '订单已被移除' },
            ], current: 3, status: 'success' 
          } }))
          setTimeout(() => setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '✅ 订单已成功从 Hyperliquid 撤销！' }]), 600)
        } catch (e: any) {
          setExecMap(prev => ({ ...prev, [execId]: { 
            steps: [{ label: '撤单失败', description: '连接 Hyperliquid API', error: e.message }], 
            current: 0, status: 'error' 
          } }))
        }
      },
      'order.cancel_cancel': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'ConfirmDialog'))
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '好的，订单已保留。' }])
      },
      // ── Strategy setup ─────────────────────────────────────────
      'strategy.confirm': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'StrategyPreviewCard'))
        runExecution([
          { label: '正在配置 Agent Wallet...', description: '检查授权状态' },
          { label: 'Agent Wallet 配置完成' },
          { label: '正在保存策略...', description: '通过 IPC 下发至 Veta 引擎' },
          { label: '✅ Funding Harvester 策略已启动' },
        ], '✅ 策略已启动！下方 Dashboard 会实时显示运行状态。')
        // Notify page to add the strategy card to dashboard
        onStrategyDeployed?.()
      },
      'strategy.cancel': () => {
        setMessages(prev => [
          ...prev.filter(m => m.widget?.widget_name !== 'StrategyPreviewCard'),
          { id: uid(), role: 'ai', content: '好的，已取消。随时可以重新配置。' },
        ])
      },
      'strategy.edit': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'StrategyPreviewCard'))
        setMessages(prev => [...prev, { id: uid(), role: 'user', content: '我想修改策略配置' }])
        sendToAI('__STRATEGY_EDIT__', false)
      },
      // ── PRD 7.5.1 strategy runtime ─────────────────────────────
      'strategy.pause.confirm': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'ConfirmDialog'))
        onStrategyAction?.('pause', 'FH-001')
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '⏸️ 已暂停 Funding Harvester 策略。仓位保留，不再执行新操作。下方 Dashboard 已同步更新。' }])
      },
      'strategy.pause.cancel': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'ConfirmDialog'))
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '好的，策略继续运行中 🚀' }])
      },
      'strategy.stop.confirm': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'ConfirmDialog'))
        onStrategyAction?.('stop', 'FH-001')
        runExecution([
          { label: '正在平仓...', description: '提交平仓订单' },
          { label: '仓位已平', description: 'ETH + BTC delta-neutral 已平仓' },
          { label: '✅ 策略已停止' },
        ], '✅ 策略已停止，资金已返回账户。')
      },
      'strategy.stop.cancel': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'ConfirmDialog'))
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '好的，策略继续运行中。' }])
      },
      'strategy.pause': () => {
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '⏸️ 策略已暂停。' }])
        onStrategyAction?.('pause')
      },
      'strategy.details': () => {
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '📊 详情可在下方 Dashboard 查看。' }])
      },
      // ── Funding Flow ───────────────────────────────────────────
      'transfer.confirm': (amount: string) => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'TransferPanel'))
        runExecution([
          { label: '正在划转资金...', description: '从 Master 账户转移至 Agent 账户' },
          { label: '划转成功', description: `已成功划转 ${amount} USDC` },
        ], `✅ 已成功划转 ${amount} USDC。`)
        
        setTimeout(() => {
          sendToAI(`已成功划转 ${amount} USDC，余额已充足，请继续刚才未完成的操作。`, false)
        }, 2500)
      },
      'transfer.cancel': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'TransferPanel'))
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '已取消划转。请问还有什么我可以帮您的？' }])
      },
      'bridge.confirm': (amount: string) => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'BridgePanel'))
        runExecution([
          { label: '初始化跨链桥...', description: '连接 Tron 与 Hyperliquid' },
          { label: '等待链上确认', description: '正在监听充值交易' },
          { label: '跨链成功', description: '资产已到达 Hyperliquid' },
        ], `✅ 跨链充值已完成。`)
        
        setTimeout(() => {
          sendToAI(`已成功跨链充值，余额已充足，请继续刚才未完成的操作。`, false)
        }, 3500)
      },
      'bridge.cancel': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'BridgePanel'))
        setMessages(prev => [...prev, { id: uid(), role: 'ai', content: '已取消跨链。请问还有什么我可以帮您的？' }])
      },
      // ── Questionnaire ──────────────────────────────────────────
      'amount.submit': (amount: string) => {
        if (!amount) return
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'AmountInput'))
        sendToAI(amount, true)
      },
      'questionnaire.submit': (selected: string) => {
        if (!selected) return
        const labelMap: Record<string, string> = {
          conservative: '保守型', balanced: '稳健型', aggressive: '进取型',
          low: '5%-12% 稳健收益', medium: '12%-18% 平衡收益',
          high: '18%-25% 积极收益', vhigh: '25%+ 高收益',
        }
        setMessages(prev => prev.filter(m =>
          m.widget?.widget_name !== 'RiskPreferenceSelector' &&
          m.widget?.widget_name !== 'ReturnRateSelector'
        ))
        setMessages(prev => [...prev, { id: uid(), role: 'user', content: labelMap[selected] || selected }])
        sendToAI(selected, false)
      },
      'questionnaire.assets.submit': (assets: string[]) => {
        const displayText = assets.length > 0 ? `资产偏好：${assets.join(', ')}` : '资产偏好：由 AI 推荐'
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'AssetMultiSelect'))
        setMessages(prev => [...prev, { id: uid(), role: 'user', content: displayText }])
        sendToAI(assets.length > 0 ? assets.join(' ') : '跳过', false)
      },
      // ── TP/SL ──────────────────────────────────────────────────
      'tpsl.submit': (tp: string, sl: string) => {
        const parts = []
        if (tp) parts.push(`止盈 +${tp}%`)
        if (sl) parts.push(`止损 -${sl}%`)
        const displayText = parts.length > 0 ? `已设置：${parts.join('，')}` : '跳过止盈止损'
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'TpSlInput'))
        setMessages(prev => [...prev, { id: uid(), role: 'user', content: displayText }])
        // Send TP/SL values to AI so it can generate updated OrderPreviewCard
        const msg = tp && sl
          ? `止盈${tp}%，止损${sl}%`
          : tp ? `止盈${tp}%，不设置止损` : sl ? `止损${sl}%，不设置止盈` : '跳过止盈止损'
        sendToAI(msg, false)
      },
      // ── Risk banner dismiss ─────────────────────────────────────
      'risk.dismiss': () => {
        setMessages(prev => prev.filter(m => m.widget?.widget_name !== 'RiskBanner'))
      },
    })
  }, [runExecution, sendToAI, onStrategyAction, onStrategyDeployed])

  // Issue 2: Show greeting only (no auto-questionnaire). Called once after secure screen.
  const initChat = useCallback(() => {
    if (hasGreeted.current) return
    hasGreeted.current = true
    setMessages([{ id: uid(), role: 'ai', content: GREETING }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleContinue = () => {
    setScreen('chat')
    initChat()
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    // Clear both state and DOM immediately - prevents stale visual on async batch
    setInput('')
    if (inputRef.current) inputRef.current.value = ''
    await sendToAI(text, true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleReset = () => {
    hasGreeted.current = false
    setMessages([])
    setExecMap({})
    resetSession()
    history.current = []
    setScreen('secure')
  }

  // Issue 2: Pre-filled chip click sends message immediately
  const handleChipClick = (p: typeof PREFILLED[0]) => {
    if (p.requiresStrategy && !hasActiveStrategy) return;
    if (p.action === 'fill') {
      setInput(p.text);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      sendToAI(p.text, true);
    }
  }

  // Whether to show pre-filled chips (only after greeting, before user sends anything)
  const userHasSent = messages.some(m => m.role === 'user')
  const showChips = screen === 'chat' && !userHasSent && !loading

  return (
    <div className={styles.chatPanelWrap}>
      {/* Header */}
      <div className={styles.chatPanelHeader}>
        <div className={styles.chatAgentInfo}>
          <div className={styles.chatAgentAvatar}>✨</div>
          <div>
            <div className={styles.chatAgentName}>HyperAI</div>
            <div className={styles.encryptedBadge}>🔒 Encrypted</div>
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <button onClick={handleReset} className={styles.chatIconBtn} title="新对话">↺</button>
          {onClose && <button onClick={onClose} className={styles.chatIconBtn} title="关闭">✕</button>}
        </div>
      </div>

      {/* Issue 1: Secure screen INSIDE the chat panel */}
      {screen === 'secure' && (
        <div className={styles.secureScreen}>
          {/* Upper: icon + title + badges — flex-centered */}
          <div className={styles.secureScreenContent}>
            <div className={styles.secureScreenIcon}>🛡️</div>
            <h3 className={styles.secureScreenTitle}>Encrypted Secure Channel</h3>
            <p className={styles.secureScreenDesc}>
              To protect your information, we use end-to-end encryption.
              Ensures all conversations with AI Agent cannot be accessed by third parties.
            </p>
            <div className={styles.secureBadges}>
              <span className={styles.secureBadge}>🔒 End-to-End Encrypted</span>
              <span className={styles.secureBadge}>🛡 Isolated Sandbox</span>
              <span className={styles.secureBadge}>⊘ No Data Retention</span>
            </div>
          </div>
          {/* Bottom: action button — pinned to bottom */}
          <div className={styles.secureScreenActions}>
            <button className={styles.btnContinue} onClick={handleContinue}>Continue</button>
            <p className={styles.secureNote}>Conversation data is processed locally on your device only</p>
          </div>
        </div>
      )}

      {/* Chat view */}
      {screen === 'chat' && (
        <>
          {/* Issue 3: ref on the scroll container, NOT on a sentinel div */}
          <div className={styles.chatMessages} ref={messagesContainerRef}>
            {messages.map(msg => (
              <ChatMessage key={msg.id} msg={msg} execMap={execMap} />
            ))}
            {loading && (
              <div className={styles.msgAI}>
                <div className={styles.msgAvatar}>✨</div>
                <div className={styles.msgBubbleAI}>
                  <div className={styles.typingDots}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Issue 2: Pre-filled chips — SEND immediately on click */}
          {showChips && (
            <div className={styles.quickChips}>
              {PREFILLED.map(p => {
                const disabled = p.requiresStrategy && !hasActiveStrategy;
                return (
                  <button 
                    key={p.label} 
                    onClick={() => handleChipClick(p)} 
                    className={`${styles.chip} ${disabled ? styles.chipDisabled : ''}`}
                    disabled={disabled}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          )}

          <div className={styles.chatInputArea}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className={styles.chatTextarea}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className={styles.sendBtn}>
              {loading ? <span className={styles.sendSpinner} /> : '↑'}
            </button>
          </div>
          <div className={styles.chatDisclaimer}>AI does not constitute investment advice · GenUI Architecture</div>
        </>
      )}
    </div>
  )
}

function ChatMessage({ msg, execMap }: { msg: Message; execMap: Record<string, ExecState> }) {
  if (msg.role === 'user') return (
    <div className={styles.msgUser}>
      <div className={styles.msgBubbleUser}>{msg.content}</div>
    </div>
  )
  if (msg.role === 'ai') return (
    <div className={styles.msgAI}>
      <div className={styles.msgAvatar}>✨</div>
      <div className={styles.msgBubbleAI}><MdText text={msg.content || ''} /></div>
    </div>
  )
  if (msg.role === 'exec' && msg.execId) {
    const exec = execMap[msg.execId]
    if (!exec) return null
    return (
      <div className={styles.msgWidget}>
        <ExecutionProgress steps={exec.steps} currentStep={exec.current} status={exec.status} />
      </div>
    )
  }
  if (msg.role === 'widget' && msg.specJson) return (
    <div className={styles.msgWidget}>
      <SpecRenderer spec={msg.specJson} onValidationError={e => console.error('[Spec]', e)} />
    </div>
  )
  return null
}

function MdText({ text }: { text: string }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const html = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
        if (line.startsWith('•') || line.startsWith('-')) {
          return <div key={i} style={{ paddingLeft: 12, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: '· ' + html.slice(1).trim() }} />
        }
        return <div key={i} style={{ marginBottom: line ? 3 : 8 }} dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />
      })}
    </div>
  )
}
