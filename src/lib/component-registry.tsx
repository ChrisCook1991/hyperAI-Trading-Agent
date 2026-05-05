'use client'
/**
 * Component Registry — 组件注册表
 * 单一真实来源（SSOT）。把 element type 字符串映射到真实 React 组件。
 * 基于 PRD 4.5.6
 */
import React from 'react'

// Composite Widgets
import { RiskPreferenceSelector } from '@/components/widgets/RiskPreferenceSelector'
import { ReturnRateSelector } from '@/components/widgets/ReturnRateSelector'
import { AmountInput } from '@/components/widgets/AmountInput'
import { AssetMultiSelect } from '@/components/widgets/AssetMultiSelect'
import { LeverageSlider } from '@/components/widgets/LeverageSlider'
import { MarketTypeSelector } from '@/components/widgets/MarketTypeSelector'
import { TpSlInput } from '@/components/widgets/TpSlInput'
import { OrderPreviewCard } from '@/components/widgets/OrderPreviewCard'
import { StrategyPreviewCard } from '@/components/widgets/StrategyPreviewCard'
import { TransferPanel } from '@/components/widgets/TransferPanel'
import { BridgePanel } from '@/components/widgets/BridgePanel'
import { ConfirmDialog } from '@/components/widgets/ConfirmDialog'
import { RiskBanner } from '@/components/widgets/RiskBanner'
import { StrategyStatusCard } from '@/components/widgets/StrategyStatusCard'
import { ExecutionProgress } from '@/components/widgets/ExecutionProgress'

// ─── Atomic Elements ───────────────────────────────────────────

function AtomText({ content, variant = 'body' }: { content: string; variant?: 'title' | 'body' | 'caption' }) {
  const styles: Record<string, React.CSSProperties> = {
    title: { fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' },
    body: { fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 'var(--leading-normal)' },
    caption: { fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' },
  }
  return <div style={styles[variant]}>{content}</div>
}

function AtomNumber({ value, currency, showSign }: { value: number; currency?: string; showSign?: boolean }) {
  const color = showSign ? (value >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-primary)'
  const sign = showSign && value > 0 ? '+' : ''
  const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))
  return (
    <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 'var(--weight-semibold)' }}>
      {sign}{currency ? `${currency} ` : ''}{fmt}
    </span>
  )
}

function AtomRow({ children, align = 'start', gap = 'md' }: { children?: React.ReactNode; align?: string; gap?: string }) {
  const gapMap: Record<string, string> = { sm: 'var(--spacing-sm)', md: 'var(--spacing-md)', lg: 'var(--spacing-lg)' }
  const justifyMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gapMap[gap] || gapMap.md, justifyContent: justifyMap[align] || 'flex-start' }}>
      {children}
    </div>
  )
}

function AtomColumn({ children, align = 'start', gap = 'md' }: { children?: React.ReactNode; align?: string; gap?: string }) {
  const gapMap: Record<string, string> = { sm: 'var(--spacing-sm)', md: 'var(--spacing-md)', lg: 'var(--spacing-lg)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: gapMap[gap] || gapMap.md, alignItems: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start' }}>
      {children}
    </div>
  )
}

function AtomDivider() {
  return <div style={{ height: 1, background: 'var(--border-light)', width: '100%' }} />
}

function AtomButton({ label, variant = 'primary', disabled, onClick }: { label: string; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; onClick?: () => void }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { padding: 'var(--spacing-md) var(--spacing-xl)', borderRadius: 'var(--radius-lg)', border: 'none', background: 'var(--brand-primary)', color: 'white', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer' },
    secondary: { padding: 'var(--spacing-md) var(--spacing-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer' },
    ghost: { padding: 'var(--spacing-md) var(--spacing-xl)', borderRadius: 'var(--radius-lg)', border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], opacity: disabled ? 0.5 : 1 }}>{label}</button>
}

function AtomLink({ label, href }: { label: string; href: string }) {
  return <a href={href} style={{ color: 'var(--brand-primary)', fontSize: 'var(--text-base)', textDecoration: 'underline' }} target="_blank" rel="noreferrer">{label}</a>
}

function AtomIcon({ name }: { name: string }) {
  // Emoji fallback for demo
  const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✓', danger: '✕', arrow: '→', star: '⭐' }
  return <span>{icons[name] || name}</span>
}

function AtomBadge({ label, tone = 'info' }: { label: string; tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  const cfg = {
    info: { bg: 'var(--info-light)', color: 'var(--info)' },
    success: { bg: 'var(--success-light)', color: 'var(--success)' },
    warning: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    danger: { bg: 'var(--danger-light)', color: 'var(--danger)' },
  }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', background: cfg[tone].bg, color: cfg[tone].color }}>
      {label}
    </span>
  )
}

// 'label' instead of 'key' — React reserves 'key' and it cannot be spread as a JSX prop
function AtomKeyValue({ label, value: v }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
    </div>
  )
}

// ─── Registry ─────────────────────────────────────────────────
export const componentRegistry: Record<string, React.ComponentType<any>> = {
  // Tier A — Composite Widgets
  RiskPreferenceSelector,
  ReturnRateSelector,
  AmountInput,
  AssetMultiSelect,
  LeverageSlider,
  MarketTypeSelector,
  TpSlInput,
  OrderPreviewCard,
  StrategyPreviewCard,
  TransferPanel,
  BridgePanel,
  ConfirmDialog,
  RiskBanner,
  StrategyStatusCard,
  ExecutionProgress,
  // Tier B — Atomic Elements
  Text: AtomText,
  Number: AtomNumber,
  Row: AtomRow,
  Column: AtomColumn,
  Divider: AtomDivider,
  Button: AtomButton,
  Link: AtomLink,
  Icon: AtomIcon,
  Badge: AtomBadge,
  KeyValue: AtomKeyValue,
}
