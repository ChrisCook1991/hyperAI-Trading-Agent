import { NextResponse } from 'next/server'
import { hyperliquid } from '@/lib/hyperliquid-client'

export async function POST(req: Request) {
  // Force hot reload for hyperliquid-client fix
  try {
    const body = await req.json()
    const { action, asset, sizeUsd, limitPrice, currentPrice, leverage, orderType } = body

    // Calculate size and order properties
    // Enforce limit vs market strictly
    const isMarket = orderType === 'market'
    const price = (orderType === 'limit' && limitPrice) ? limitPrice : currentPrice
    
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    if (action === 'close') {
      const positions = await hyperliquid.getPositions()
      const pos = positions.find((p: any) => p.coin === asset.toUpperCase())
      if (!pos || pos.size === 0) {
        return NextResponse.json({ error: `No active ${asset} position found to close` }, { status: 400 })
      }
      
      const posSize = pos.size
      const closeIsBuy = posSize < 0
      const sizeToClose = Math.abs(posSize)

      console.log(`[API Trade] Closing position: ${closeIsBuy ? 'BUY' : 'SELL'} ${sizeToClose} ${asset} @ ${price}`)

      const result = await hyperliquid.placeOrder({
        asset,
        isBuy: closeIsBuy,
        price,
        size: sizeToClose,
        isMarket,
        reduceOnly: true
      })

      return result.status === 'ok' 
        ? NextResponse.json({ success: true, result }) 
        : NextResponse.json({ success: false, error: result.response?.type || 'Execution failed' }, { status: 400 })
    }

    // Normal Open Order Logic
    const isBuy = action === 'open_long' || action === 'buy'

    // size = sizeUsd / price (rounded natively in client now)
    const size = sizeUsd / price

    console.log(`[API Trade] Placing order: ${isBuy ? 'BUY' : 'SELL'} ${size} ${asset} @ ${price}`)

    const result = await hyperliquid.placeOrder({
      asset,
      isBuy,
      price,
      size,
      isMarket,
      leverage
    })

    if (result.status === 'ok') {
      return NextResponse.json({ success: true, result })
    } else {
      return NextResponse.json({ success: false, error: result.response?.type || 'Execution failed' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const asset = searchParams.get('asset')
    const oid = searchParams.get('oid')

    if (!asset || !oid) {
      return NextResponse.json({ error: 'Missing asset or oid' }, { status: 400 })
    }

    const result = await hyperliquid.cancelOrder(asset, parseInt(oid, 10))
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
