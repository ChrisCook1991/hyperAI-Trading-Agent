/**
 * AI Agent — Dual Mode
 * Primary: OpenRouter → Gemini 2.5 Flash (via /api/chat Server Route)
 * Fallback: Mock mode (regex-based) when API is unavailable
 */

export interface RenderWidget {
  widget_name: string
  data: Record<string, unknown>
  emphasis_level?: 'default' | 'warning' | 'danger'
  locale?: string
  events?: Record<string, string>
}

export interface AIResponse {
  text: string
  render_widget?: RenderWidget
  intent_type?: 'direct_order' | 'strategy' | 'wallet' | 'query'
  clarity_level?: 'L1' | 'L2' | 'L3' | 'L4'
}

// ─── Real API Call (primary path) ──────────────────────────────────
export async function callAI(
  userInput: string,
  history: Array<{ role: string; content: string }>,
): Promise<AIResponse> {
  // Internal triggers bypass LLM — handled by mock directly
  if (userInput === '__STRATEGY_EDIT__') {
    return callAIMock(userInput, history)
  }

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data: AIResponse = await res.json()

    // Validate minimal shape
    if (typeof data.text !== 'string') throw new Error('Invalid response shape')

    // Inject locale + default events for widgets that need them
    if (data.render_widget) {
      data.render_widget.locale = data.render_widget.locale || 'zh-CN'
      if (!data.render_widget.events) data.render_widget.events = {}
    }

    return data
  } catch (err) {
    console.warn('[callAI] API failed, falling back to mock:', err)
    return callAIMock(userInput, history)
  }
}

// ─── Mock Flow State (fallback) ─────────────────────────────────────
interface FlowState {
  type: 'idle' | 'direct_order' | 'strategy_questionnaire' | 'strategy_confirm' | 'executing'
  step?: string
  params?: Record<string, unknown>
}

let flowState: FlowState = { type: 'idle' }
let sessionRiskShown = false

export function resetSession() {
  flowState = { type: 'idle' }
  sessionRiskShown = false
}


// ─── Mock 场景识别 ─────────────────────────────────────────────
function detectIntent(input: string): { type: string; params?: Record<string, unknown> } {
  const lc = input.toLowerCase()

  // 下单意图
  if (/eth.*(?:多单|做多|开多|long|买|开仓)|(?:多单|做多|开多).*eth/i.test(input) ||
    /开.*(?:eth|btc|sol|hype).*(?:单|仓|多|空)/i.test(input) ||
    /(?:帮我|在\s*hyperliquid).*(?:开|买|做)/i.test(input)) {
    const hasSize = /\d+\s*u?s?d?c?/i.test(input)
    const hasTP = /tp|止盈|\+\d+%/.test(lc)
    const hasSL = /sl|止损|-\d+%/.test(lc)
    const hasLev = /(\d+)x|(\d+)\s*倍|lever/i.test(input)
    const levMatch = input.match(/(\d+)\s*x/i) || input.match(/(\d+)\s*倍/)
    const lev = levMatch ? parseInt(levMatch[1]) : 2
    const tpMatch = input.match(/(?:tp|止盈)[^\d]*(\d+)/i)
    const slMatch = input.match(/(?:sl|止损)[^\d]*(\d+)/i)
    const priceMatch = input.match(/(?:开单价|限价|价格)[^\d]*(\d+)/i) || input.match(/(\d{3,5})/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 2500
    return {
      type: hasSize ? 'direct_order_l1' : 'direct_order_l2',
      params: { leverage: lev, tpPercent: tpMatch ? parseInt(tpMatch[1]) : null, slPercent: slMatch ? parseInt(slMatch[1]) : null, limitPrice: price, asset: /btc/i.test(input) ? 'BTC' : /sol/i.test(input) ? 'SOL' : 'ETH' }
    }
  }

  // 策略意图
  if (/funding.*harvest|资金费|稳定收益|套利|推荐.*策略|策略.*推荐|稳健|自动/i.test(input)) {
    return { type: 'strategy_direct' }
  }
  if (/赚钱|稳定|增值|理财|收益/i.test(input)) {
    return { type: 'strategy_questionnaire' }
  }

  // ─── PRD 7.5.1 — 策略运行时操作意图
  if (/暂停.*策略|策略.*暂停|pause.*strat/i.test(input)) {
    return { type: 'strategy_pause' }
  }
  if (/停止.*策略|策略.*停止|删除.*策略|stop.*strat/i.test(input)) {
    return { type: 'strategy_stop' }
  }
  if (/调整.*参数|修改.*参数|策略.*参数|adjust.*param/i.test(input)) {
    return { type: 'strategy_adjust' }
  }

  // 撤单意图
  if (/撤销.*订单|取消.*订单|撤单|cancel.*order/i.test(input)) {
    return { type: 'cancel_order', params: { asset: 'ETH', oid: 12345 } }
  }

  // 查询意图
  if (/价格|多少钱|行情|btc|eth.*现在|现在.*eth/i.test(input)) {
    return { type: 'query_price', params: { asset: /btc/i.test(input) ? 'BTC' : 'ETH' } }
  }
  if (/策略.*状态|状态.*策略|怎么样|运行/i.test(input)) {
    return { type: 'query_strategy' }
  }

  return { type: 'unknown' }
}

// ─── Mock AI 响应生成（Fallback）────────────────────────────────
async function callAIMock(userInput: string, history: Array<{ role: string; content: string }>): Promise<AIResponse> {
  // 模拟网络延迟
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400))

  // 风险免责（每 session 首次）
  const riskPrefix = !sessionRiskShown
    ? '⚠️ **温馨提示**：加密货币交易存在波动风险。AI 仅作为您的辅助工具，不构成投资建议。继续操作即代表您已了解并愿意承担相关风险。\n\n'
    : ''
  sessionRiskShown = true

  // ─── 内部触发词：strategy.edit 按钮 ───────────────────────────
  // 由 ChatModal strategy.edit handler 发出，不是用户直接输入
  if (userInput === '__STRATEGY_EDIT__') {
    flowState = { type: 'strategy_questionnaire', step: 'q1', params: {} }
    return {
      text: '好的，我们重新来配置一下。你的风险偏好是？',
      intent_type: 'strategy',
      clarity_level: 'L3',
      render_widget: {
        widget_name: 'RiskPreferenceSelector',
        data: {},
        locale: 'zh-CN',
        events: { onSubmit: 'questionnaire.submit' },
      },
    }
  }

  // 流程中间状态处理
  if (flowState.type === 'direct_order' && flowState.step === 'waiting_size') {
    const amount = userInput.replace(/[^0-9.]/g, '')
    if (!amount || parseFloat(amount) < 10) {
      return { text: '请输入有效金额（最小 $10 USDC）。', render_widget: { widget_name: 'AmountInput', data: { balance: 0, min: 10, currency: 'USDC' }, locale: 'zh-CN' } }
    }
    const params = { ...flowState.params, sizeUsd: parseFloat(amount) }
    flowState = { type: 'idle' }
    const lev = params.leverage as number || 2
    const tp = params.tpPercent as number | null
    const sl = params.slPercent as number | null
    const price = params.limitPrice as number || 2500
    const asset = params.asset as string || 'ETH'
    const qty = (parseFloat(amount) * lev / price).toFixed(4)
    const liqPrice = Math.round(price * (1 - 1 / lev * 0.85))
    return {
      text: `好的，参数已就绪！请确认以下订单详情：`,
      intent_type: 'direct_order', clarity_level: 'L1',
      render_widget: {
        widget_name: 'OrderPreviewCard',
        data: {
          platform: 'Hyperliquid', marketType: 'perp', action: 'open_long',
          asset, orderType: 'limit', sizeUsd: parseFloat(amount),
          leverage: lev, limitPrice: price,
          tpPercent: tp, slPercent: sl,
          estimatedQty: parseFloat(qty), estimatedFee: (parseFloat(amount) * 0.0005).toFixed(2),
          estimatedLiquidationPrice: liqPrice, accountBalance: 0,
          onConfirm: undefined, onCancel: undefined,
        },
        emphasis_level: !sl ? 'warning' : 'default',
        locale: 'zh-CN',
        events: { onConfirm: 'order.confirm', onCancel: 'order.cancel' },
      }
    }
  }

  if (flowState.type === 'strategy_questionnaire') {
    if (flowState.step === 'q1') {
      flowState = { ...flowState, step: 'q2', params: { ...flowState.params, riskPreference: userInput } }
      return {
        text: '明白了。你期望的年化收益率大概是多少？',
        render_widget: {
          widget_name: 'ReturnRateSelector',
          data: {},
          locale: 'zh-CN',
          events: { onSubmit: 'questionnaire.submit' },
        }
      }
    }
    if (flowState.step === 'q2') {
      flowState = { ...flowState, step: 'q3', params: { ...flowState.params, expectedReturn: userInput } }
      return {
        text: '这次大概准备投入多少资金？',
        render_widget: {
          widget_name: 'AmountInput',
          data: { balance: 5000, min: 100, currency: 'USDC', placeholder: '建议 1000 USDC 起', submitLabel: '确认金额' },
          locale: 'zh-CN',
          events: { onSubmit: 'amount.submit' },
        }
      }
    }
    if (flowState.step === 'q3') {
      const amount = parseFloat(userInput.replace(/[^0-9.]/g, '')) || 2500
      flowState = { ...flowState, step: 'q4', params: { ...flowState.params, totalInvestment: amount } }
      return {
        text: '你有什么特别偏好的资产吗？（可多选，或点击「AI 自动推荐资产」跳过）',
        render_widget: {
          widget_name: 'AssetMultiSelect',
          data: { value: [], max: 4, submitLabel: '确认资产选择' },
          locale: 'zh-CN',
          events: { onSubmit: 'questionnaire.assets.submit' },
        }
      }
    }
    if (flowState.step === 'q4') {
      const inv = flowState.params?.totalInvestment as number || 2500
      flowState = { type: 'idle' }
      return {
        text: `根据你的偏好，我推荐 **Funding Harvester（资金费率套利）** 策略。这是目前最稳健的低风险收益策略，以下是详细配置：`,
        intent_type: 'strategy', clarity_level: 'L1',
        render_widget: {
          widget_name: 'StrategyPreviewCard',
          data: {
            strategyName: 'Funding Harvester', description: '通过现货+反向合约对冲，赚取资金费率收益',
            totalInvestment: inv, selectedAssets: ['BTC', 'ETH'],
            historicalApy: { min: 15, max: 55 }, maxDrawdown: { min: 2, max: 5 },
            fundingRateThreshold: 0.01, spotPerpRatio: '1:1', settlementFrequency: '每8小时',
            rebalanceFrequency: '每8小时', showRiskAcknowledgement: true,
          },
          emphasis_level: 'default', locale: 'zh-CN',
          events: { onConfirm: 'strategy.confirm', onCancel: 'strategy.cancel', onEdit: 'strategy.edit' },
        }
      }
    }
  }

  // 新意图识别
  const intent = detectIntent(userInput)

  if (intent.type === 'direct_order_l2') {
    flowState = { type: 'direct_order', step: 'waiting_size', params: intent.params }
    const asset = intent.params?.asset as string || 'ETH'
    const lev = intent.params?.leverage as number || 2
    
    let realBal = 0
    try { 
      const res = await fetch('/api/balance')
      const data = await res.json()
      realBal = data.balance || 0
    } catch (e) {}

    return {
      text: `${riskPrefix}好的，理解了。**${asset} 永续合约多单**，${lev}x 杠杆${intent.params?.limitPrice ? `，限价 $${intent.params.limitPrice}` : '，市价'}${intent.params?.tpPercent ? `，止盈 +${intent.params.tpPercent}%` : ''}${intent.params?.slPercent ? `，止损 -${intent.params.slPercent}%` : ''}。\n\n请问你想投入多少 USDC？`,
      intent_type: 'direct_order', clarity_level: 'L2',
      render_widget: { widget_name: 'AmountInput', data: { balance: realBal, min: 10, currency: 'USDC' }, locale: 'zh-CN' }
    }
  }

  if (intent.type === 'direct_order_l1') {
    const p = intent.params || {}
    const asset = p.asset as string || 'ETH'
    const lev = p.leverage as number || 2
    const price = p.limitPrice as number || 2500
    const size = 500
    const qty = (size * lev / price).toFixed(4)
    const liqPrice = Math.round(price * (1 - 1 / lev * 0.85))
    let realBal = 0
    try { 
      const res = await fetch('/api/balance')
      const data = await res.json()
      realBal = data.balance || 0
    } catch (e) {}
    
    return {
      text: `${riskPrefix}好的，确认订单参数如下：`,
      intent_type: 'direct_order', clarity_level: 'L1',
      render_widget: {
        widget_name: 'OrderPreviewCard',
        data: {
          platform: 'Hyperliquid', marketType: 'perp', action: 'open_long',
          asset, orderType: 'limit', sizeUsd: size, leverage: lev, limitPrice: price,
          tpPercent: p.tpPercent || null, slPercent: p.slPercent || null,
          estimatedQty: parseFloat(qty), estimatedFee: (size * 0.0005).toFixed(2),
          estimatedLiquidationPrice: liqPrice, accountBalance: realBal,
        },
        emphasis_level: !p.slPercent ? 'warning' : 'default',
        locale: 'zh-CN',
        events: { onConfirm: 'order.confirm', onCancel: 'order.cancel' },
      }
    }
  }

  if (intent.type === 'strategy_direct') {
    return {
      text: `${riskPrefix}好的！根据你的需求，直接推荐 **Funding Harvester（资金费率套利）** 策略：`,
      intent_type: 'strategy', clarity_level: 'L1',
      render_widget: {
        widget_name: 'StrategyPreviewCard',
        data: {
          strategyName: 'Funding Harvester', description: '通过现货+反向合约对冲，赚取资金费率收益',
          totalInvestment: 2500, selectedAssets: ['BTC', 'ETH'],
          historicalApy: { min: 15, max: 55 }, maxDrawdown: { min: 2, max: 5 },
          fundingRateThreshold: 0.01, spotPerpRatio: '1:1', settlementFrequency: '每8小时',
          rebalanceFrequency: '每8小时', showRiskAcknowledgement: true,
        },
        emphasis_level: 'default', locale: 'zh-CN',
        events: { onConfirm: 'strategy.confirm', onCancel: 'strategy.cancel', onEdit: 'strategy.edit' },
      }
    }
  }

  if (intent.type === 'strategy_questionnaire') {
    flowState = { type: 'strategy_questionnaire', step: 'q1', params: {} }
    return {
      text: `${riskPrefix}好的！为了给你推荐最合适的策略，我先了解一下你的情况。你的风险偏好是？`,
      intent_type: 'strategy',
      clarity_level: 'L3',
      render_widget: {
        widget_name: 'RiskPreferenceSelector',
        data: {},
        locale: 'zh-CN',
        events: { onSubmit: 'questionnaire.submit' },
      },
    }
  }

  if (intent.type === 'cancel_order') {
    const riskPrefixLocal = !sessionRiskShown ? '⚠️ **温馨提示**：加密货币交易存在波动风险。AI 仅作为您的辅助工具，不构成投资建议。继续操作即代表您已了解并愿意承担相关风险。\n\n' : ''
    sessionRiskShown = true
    return {
      text: `${riskPrefixLocal}请确认是否要撤销最近的一笔 ETH 限价单？`,
      intent_type: 'direct_order', clarity_level: 'L1',
      render_widget: {
        widget_name: 'ConfirmDialog',
        data: {
          title: '撤销订单',
          message: '确定要撤销 ETH 限价单吗？操作后该订单将失效。',
          confirmLabel: '确认撤单',
          cancelLabel: '保留订单',
          emphasis: 'warning',
        },
        locale: 'zh-CN',
        events: { onConfirm: 'order.cancel_submit', onCancel: 'order.cancel_cancel' },
      }
    }
  }

  if (intent.type === 'query_price') {
    const asset = intent.params?.asset as string || 'ETH'
    const prices: Record<string, number> = { BTC: 94320, ETH: 2498, SOL: 148, HYPE: 24.5 }
    const price = prices[asset] || 2498
    return {
      text: `${asset} 当前价格 **$${price.toLocaleString()}**。`,
      render_widget: {
        widget_name: 'KeyValue',
        data: { label: `${asset}/USDT 实时价格`, value: `$${price.toLocaleString()}` },
        locale: 'zh-CN',
      }
    }
  }

  if (intent.type === 'query_strategy') {
    return {
      text: `你的 Funding Harvester 策略当前运行状态：`,
      render_widget: {
        widget_name: 'StrategyStatusCard',
        data: {
          strategyName: 'Funding Harvester', strategyId: 'FH-001', status: 'running',
          totalInvestment: 2500, currentEquity: 2672.3, totalPnl: 172.3, roe: 6.89,
          assets: ['BTC', 'ETH'], nextRebalance: '1h 42m', lastUpdate: '刚刚',
        },
        locale: 'zh-CN',
        events: { onPause: 'strategy.pause', onViewDetails: 'strategy.details' },
      }
    }
  }

  // ─── PRD 7.5.1 — 策略运行时操作
  if (intent.type === 'strategy_pause') {
    return {
      text: '确定要暂停 **Funding Harvester** 策略吗？暂停后仓位将保留，不再执行新操作。',
      render_widget: {
        widget_name: 'ConfirmDialog',
        data: {
          title: '暂停策略',
          message: '暂停后仓位将保留，资金费仍会继续产生盈亏。可随时恢复策略运行。',
          confirmLabel: '确认暂停',
          cancelLabel: '取消',
          severity: 'warning',
        },
        locale: 'zh-CN',
        events: { onConfirm: 'strategy.pause.confirm', onCancel: 'strategy.pause.cancel' },
      }
    }
  }

  if (intent.type === 'strategy_stop') {
    return {
      text: '⚠️ 停止策略将立即平掉所有仓位，请谨慎确认。',
      render_widget: {
        widget_name: 'ConfirmDialog',
        data: {
          title: '停止并平仓',
          message: '停止 Funding Harvester 策略将立即市价平掉 ETH + BTC 所有仓位，可能产生滑点损失，操作不可撤销。',
          confirmLabel: '确认停止平仓',
          cancelLabel: '取消',
          severity: 'danger',
        },
        locale: 'zh-CN',
        events: { onConfirm: 'strategy.stop.confirm', onCancel: 'strategy.stop.cancel' },
      }
    }
  }

  if (intent.type === 'strategy_adjust') {
    return {
      text: '以下是当前策略配置，你可以修改后确认生效：',
      render_widget: {
        widget_name: 'StrategyPreviewCard',
        data: {
          strategyName: 'Funding Harvester', description: '通过现货+反向合约对冲，赚取资金费率收益',
          totalInvestment: 2500, selectedAssets: ['BTC', 'ETH'],
          historicalApy: { min: 15, max: 55 }, maxDrawdown: { min: 2, max: 5 },
          fundingRateThreshold: 0.01, spotPerpRatio: '1:1',
          settlementFrequency: '每8小时', rebalanceFrequency: '每8小时',
          showRiskAcknowledgement: false,
        },
        emphasis_level: 'default', locale: 'zh-CN',
        events: { onConfirm: 'strategy.confirm', onCancel: 'strategy.cancel', onEdit: 'strategy.edit' },
      }
    }
  }

  // ─── 内部初始问候触发词（聊天面板打开时）
  if (userInput === '__INIT_GREET__') {
    return {
      text: '',
      render_widget: {
        widget_name: 'RiskPreferenceSelector',
        data: {},
        locale: 'zh-CN',
        events: { onSubmit: 'questionnaire.submit' },
      }
    }
  }

  // 默认回复
  return {
    text: `${riskPrefix}你好！我是 HyperAI，你的 Hyperliquid 智能交易助手。\n\n你可以试试这些指令：\n• **"帮我开一笔 ETH 2x 限价单"** → 下单流程\n• **"帮我推荐稳定策略"** → Funding Harvester 配置\n• **"暂停我的 Funding Harvester 策略"** → 暂停确认\n• **"停止策略"** → 平仓并停止`,
  }
}
