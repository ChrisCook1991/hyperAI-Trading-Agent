import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HyperAI Agent — AI Trading GenUI Demo',
  description: 'GenUI (Generative UI) 架构演示：AI Agent 通过 Spec JSON 驱动 UI 渲染，实现 Hyperliquid 智能交易助手',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
