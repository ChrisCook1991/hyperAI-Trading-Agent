import { NextResponse } from 'next/server'
import { hyperliquid } from '@/lib/hyperliquid-client'

export async function GET() {
  try {
    const state = await hyperliquid.getAccountState()
    return NextResponse.json({ 
      balance: state.availableBalance, // for backward compatibility 
      totalEquity: state.totalEquity,
      availableBalance: state.availableBalance
    })
  } catch (error: any) {
    console.error('Balance fetch error:', error)
    return NextResponse.json({ balance: 0, totalEquity: 0, availableBalance: 0 })
  }
}
