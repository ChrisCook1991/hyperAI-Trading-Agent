/**
 * Spec JSON 运行时校验器
 * 基于 PRD 4.5.5 硬约束 (GENUI-H1~H7)
 */
import { z } from 'zod'

// ─── 禁止样式字段白名单（GENUI-H2）───────────────────────────
const FORBIDDEN_PROPS = new Set([
  'style', 'className', 'color', 'fontSize', 'width', 'height',
  'padding', 'margin', 'background', 'border', 'display', 'flex',
  'fontWeight', 'lineHeight', 'overflow', 'position', 'top', 'left',
  'right', 'bottom', 'zIndex', 'opacity', 'transform', 'transition',
  'borderRadius', 'boxShadow', 'gap', 'gridTemplateColumns',
  'alignItems', 'justifyContent', 'flexDirection',
])

// ─── 复合 Widget 白名单（Tier A）────────────────────────────
export const COMPOSITE_WIDGETS = [
  'RiskPreferenceSelector', 'ReturnRateSelector', 'AmountInput',
  'AssetMultiSelect', 'LeverageSlider', 'MarketTypeSelector', 'TpSlInput',
  'OrderPreviewCard', 'StrategyPreviewCard', 'TransferPanel',
  'BridgePanel', 'ConfirmDialog', 'RiskBanner', 'StrategyStatusCard',
  'ExecutionProgress',
] as const
export type CompositeWidgetType = typeof COMPOSITE_WIDGETS[number]

// ─── 原子元素白名单（Tier B）────────────────────────────────
export const ATOMIC_ELEMENTS = [
  'Text', 'Number', 'Row', 'Column', 'Divider',
  'Button', 'Link', 'Icon', 'Badge', 'KeyValue',
] as const
export type AtomicElementType = typeof ATOMIC_ELEMENTS[number]

export const ALL_TYPES = [...COMPOSITE_WIDGETS, ...ATOMIC_ELEMENTS] as const
export type ComponentType = typeof ALL_TYPES[number]

// ─── URL 白名单（GENUI-H5）──────────────────────────────────
const URL_ALLOWLIST = [
  /^https?:\/\/(www\.)?alpha\.token\.im/,
  /^atim:\/\//,
]
const isAllowedUrl = (url: string): boolean =>
  URL_ALLOWLIST.some((re) => re.test(url))

// ─── Zod Schemas ──────────────────────────────────────────

const EventsSchema = z.record(z.string()).optional()

// 通用 props：拒绝样式字段
const SafePropsSchema = z.record(z.unknown()).optional()
  .superRefine((props, ctx) => {
    if (!props) return
    for (const key of Object.keys(props)) {
      if (FORBIDDEN_PROPS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `GENUI-H2: props 中禁止样式字段 "${key}"`,
        })
      }
      // 检查内嵌 HTML（GENUI-H3）
      if (key === 'dangerouslySetInnerHTML' || (typeof props[key] === 'string' && /<script|onclick=/i.test(String(props[key])))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `GENUI-H3: props 中禁止内嵌 HTML/JS`,
        })
      }
    }
    // 检查 URL 白名单
    const urlKeys = ['href', 'deep_link', 'url']
    for (const k of urlKeys) {
      if (props[k] && typeof props[k] === 'string' && !isAllowedUrl(props[k] as string)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `GENUI-H5: URL "${props[k]}" 不在白名单内`,
        })
      }
    }
  })

const ElementSchema = z.object({
  type: z.enum(ALL_TYPES, {
    errorMap: (_, ctx) => ({
      message: `GENUI-H1: 未注册的组件类型 "${ctx.data}"`,
    }),
  }),
  props: SafePropsSchema,
  children: z.array(z.string()).optional(),
  events: EventsSchema,
})

export const SpecJSONSchema = z.object({
  root: z.string(),
  elements: z.record(ElementSchema),
  context: z.object({
    locale: z.enum(['zh-CN', 'zh-TW', 'en']),
    emphasis_level: z.enum(['default', 'warning', 'danger']).optional(),
  }),
}).superRefine((spec, ctx) => {
  // GENUI-H7: 节点数 <= 50
  const nodeCount = Object.keys(spec.elements).length
  if (nodeCount > 50) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `GENUI-H7: 节点数 ${nodeCount} 超过 50 上限`,
    })
  }
  // root 存在
  if (!spec.elements[spec.root]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `root "${spec.root}" 在 elements 中不存在`,
    })
  }
  // 检查嵌套深度 <= 5（GENUI-H7）
  const checkDepth = (id: string, depth: number) => {
    if (depth > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `GENUI-H7: 嵌套深度超过 5 层 (at "${id}")`,
      })
      return
    }
    const el = spec.elements[id]
    if (!el || !el.children) return
    for (const childId of el.children) {
      checkDepth(childId, depth + 1)
    }
  }
  checkDepth(spec.root, 1)
})

export type SpecJSON = z.infer<typeof SpecJSONSchema>
export type SpecElement = z.infer<typeof ElementSchema>

// ─── 验证入口 ─────────────────────────────────────────────
export function validateSpecJSON(raw: unknown): { success: true; data: SpecJSON } | { success: false; errors: string[] } {
  const result = SpecJSONSchema.safeParse(raw)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errors = result.error.issues.map(i => `[${i.path.join('.')}] ${i.message}`)
  return { success: false, errors }
}
