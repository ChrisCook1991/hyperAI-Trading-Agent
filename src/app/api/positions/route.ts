import { NextResponse } from 'next/server'
import { hyperliquid } from '@/lib/hyperliquid-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const positions = await hyperliquid.getPositions()
    return NextResponse.json({ success: true, positions })
  } catch (error: any) {
    console.error('Positions fetch error:', error)
    return NextResponse.json({ success: false, positions: [] })
  }
}
