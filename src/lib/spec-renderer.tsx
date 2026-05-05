'use client'
/**
 * SpecRenderer — GenUI 解析引擎
 * 递归遍历 Spec JSON，查 componentRegistry 渲染真实组件
 * 基于 PRD 4.5.2 Layer 2
 */
import React from 'react'
import { validateSpecJSON, type SpecJSON } from './spec-validator'
import { componentRegistry } from './component-registry'
import { getEventHandler } from './event-handler'

interface SpecRendererProps {
  spec: unknown
  onValidationError?: (errors: string[]) => void
}

export function SpecRenderer({ spec, onValidationError }: SpecRendererProps) {
  const validation = validateSpecJSON(spec)
  if (!validation.success) {
    console.error('[SpecRenderer] Spec JSON 校验失败:', validation.errors)
    onValidationError?.(validation.errors)
    return (
      <div style={{
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--danger-light)',
        border: '1px solid rgba(212,24,61,0.2)',
        fontSize: 'var(--text-sm)',
        color: 'var(--danger)',
      }}>
        <strong>⚠️ Spec JSON 校验失败</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
          {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    )
  }
  return <ElementNode id={validation.data.root} spec={validation.data} depth={0} />
}

interface ElementNodeProps {
  id: string
  spec: SpecJSON
  depth: number
}

function ElementNode({ id, spec, depth }: ElementNodeProps) {
  const el = spec.elements[id]
  if (!el) {
    console.warn(`[SpecRenderer] element "${id}" 不存在`)
    return null
  }
  if (depth > 5) {
    console.warn(`[SpecRenderer] 嵌套深度超限 at "${id}"`)
    return null
  }

  const Component = componentRegistry[el.type]
  if (!Component) {
    console.warn(`[SpecRenderer] 未注册组件类型 "${el.type}"`)
    return (
      <div style={{ padding: 'var(--spacing-sm)', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--warning)' }}>
        未知组件: {el.type}
      </div>
    )
  }

  // 解析 children
  const childrenElements = el.children?.map(childId => (
    <ElementNode key={childId} id={childId} spec={spec} depth={depth + 1} />
  ))

  // 解析 events → 绑定 handler（保留所有参数，支持 onSubmit(value)、onConfirm(data) 等）
  const eventProps: Record<string, (...args: any[]) => void> = {}
  if (el.events) {
    for (const [eventName, eventId] of Object.entries(el.events)) {
      const handler = getEventHandler(eventId as string)
      if (handler) {
        // 用展开运算符保证 onSubmit(value)、onConfirm(payload) 等参数原样透传
        eventProps[eventName] = (...args: any[]) => handler(...args)
      }
    }
  }

  // 过滤 React 保留字（key, ref 不能通过 spread 传入组件）
  const rawProps = el.props || {}
  const { key: _reservedKey, ref: _reservedRef, ...safeProps } = rawProps as any
  const props = { ...safeProps, ...eventProps }
  if (childrenElements && childrenElements.length > 0) {
    props.children = childrenElements
  }

  return <Component {...props} />
}

/**
 * 从 render_widget 指令构造 Spec JSON（适配 AI Agent 的 render_widget 格式）
 * 自动过滤 undefined / function 值（不可序列化，且 callbacks 应通过 events 绑定）
 */
export function buildSpecFromWidget(renderWidget: {
  widget_name: string
  data: Record<string, unknown>
  emphasis_level?: 'default' | 'warning' | 'danger'
  locale?: string
  events?: Record<string, string>
}): SpecJSON {
  // 过滤 undefined 和 function 类型的 props
  const safeData: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(renderWidget.data)) {
    if (v !== undefined && typeof v !== 'function') {
      safeData[k] = v
    }
  }
  return {
    root: 'root_widget',
    elements: {
      root_widget: {
        type: renderWidget.widget_name as any,
        props: safeData,
        events: renderWidget.events || {},
      },
    },
    context: {
      locale: (renderWidget.locale as any) || 'zh-CN',
      emphasis_level: renderWidget.emphasis_level || 'default',
    },
  }
}
