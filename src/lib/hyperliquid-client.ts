import { ethers } from 'ethers'
// Import dynamically or as type if possible to avoid breaking if not installed yet.
// We'll use the types and methods from @nktkas/hyperliquid
import * as hl from '@nktkas/hyperliquid'

export class HyperliquidService {
  private exchClient: hl.ExchangeClient
  private infoClient: hl.InfoClient
  private walletAddress: string

  constructor() {
    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('Missing HYPERLIQUID_PRIVATE_KEY environment variable')
    }

    const isTestnet = process.env.HYPERLIQUID_ENV !== 'mainnet'
    
    // Setup wallet using ethers
    const wallet = new ethers.Wallet(privateKey)
    
    // Setup HttpTransport
    const transport = new hl.HttpTransport({ isTestnet })
    
    // The Agent wallet only signs; the main wallet holds funds
    const mainAddress = process.env.HYPERLIQUID_MAIN_ADDRESS
    if (!mainAddress) {
      console.warn('Missing HYPERLIQUID_MAIN_ADDRESS, defaulting to agent address')
    }
    this.walletAddress = mainAddress || wallet.address

    // Initialize the Exchange Client
    this.exchClient = new hl.ExchangeClient({ 
      wallet, 
      transport
    })
    
    // Initialize the Info Client
    this.infoClient = new hl.InfoClient({ transport })

  }

  async getAccountState(): Promise<{ totalEquity: number, availableBalance: number }> {
    try {
      const perpState = await this.infoClient.clearinghouseState({ user: this.walletAddress })
      const spotState = await this.infoClient.spotClearinghouseState({ user: this.walletAddress })
      
      const usdc = spotState.balances.find((b: any) => b.coin === 'USDC')
      const spotTotal = usdc ? parseFloat(usdc.total) : 0
      const spotHold = usdc ? parseFloat(usdc.hold) : 0
      
      let unrealizedPnl = 0
      if (perpState.assetPositions) {
        for (const p of perpState.assetPositions) {
          unrealizedPnl += parseFloat(p.position.unrealizedPnl) || 0
        }
      }

      // Total Equity: Spot USDC + Unrealized PnL of Perps
      const totalEquity = spotTotal + unrealizedPnl
      
      // Available Balance: Spot USDC minus any holds (used for spot orders and perp margins if unified)
      const availableBalance = spotTotal - spotHold
      
      return { totalEquity, availableBalance }
    } catch (e: any) {
      console.error('[HyperliquidService] get balance error:', e)
      return { totalEquity: 0, availableBalance: 0 }
    }
  }

  async getPrices(assets: string[]): Promise<Record<string, number>> {
    try {
      const metaCtx = await this.infoClient.metaAndAssetCtxs()
      const universe = metaCtx[0].universe as any[]
      const ctxs = metaCtx[1] as any[]
      
      const prices: Record<string, number> = {}
      for (const asset of assets) {
        const index = universe.findIndex((u: any) => u.name === asset)
        if (index !== -1 && ctxs[index]) {
          prices[asset] = parseFloat(ctxs[index].markPx)
        }
      }
      return prices
    } catch (e: any) {
      console.error('[HyperliquidService] get prices error:', e)
      return {}
    }
  }

  async getPositions() {
    try {
      const state = await this.infoClient.clearinghouseState({ user: this.walletAddress })
      return state.assetPositions.map((p: any) => ({
        coin: p.position.coin,
        size: parseFloat(p.position.szi),
        entryPrice: parseFloat(p.position.entryPx),
        positionValue: parseFloat(p.position.positionValue),
        unrealizedPnl: parseFloat(p.position.unrealizedPnl),
        leverage: p.position.leverage.value
      }))
    } catch (e: any) {
      console.error('[HyperliquidService] get positions error:', e)
      return []
    }
  }

  async placeOrder(params: {
    asset: string,
    isBuy: boolean,
    price: number,
    size: number,
    isMarket?: boolean,
    leverage?: number,
    reduceOnly?: boolean
  }) {
    // Fetch dynamic meta to get the correct asset index and szDecimals
    const meta = await this.infoClient.meta()
    const assetIndex = meta.universe.findIndex((u: any) => u.name === params.asset.toUpperCase())
    if (assetIndex === -1) {
      throw new Error(`Unsupported asset for trading: ${params.asset}`)
    }

    const assetMeta = meta.universe[assetIndex]
    const szDecimals = assetMeta.szDecimals

    // Update leverage if specified
    if (params.leverage && params.leverage > 0) {
      try {
        await this.exchClient.updateLeverage({
          asset: assetIndex,
          isCross: true,
          leverage: params.leverage
        })
      } catch (e: any) {
        console.warn(`[HyperliquidService] Failed to set leverage: ${e.message}`)
      }
    }

    // Truncate size to the correct number of decimals
    const factor = Math.pow(10, szDecimals)
    const roundedSize = Math.floor(params.size * factor) / factor

    if (roundedSize <= 0) {
      throw new Error(`Order size too small. Minimum required decimals: ${szDecimals}`)
    }

    // Prepare the order request
    const orderRequest = {
      a: assetIndex,
      b: params.isBuy,
      p: params.price.toString(),
      s: roundedSize.toString(),
      r: params.reduceOnly || false,
      t: params.isMarket ? { limit: { tif: 'Ioc' as const } } : { limit: { tif: 'Gtc' as const } }
    }

    try {
      const response = await this.exchClient.order({
        orders: [orderRequest],
        grouping: 'na'
      })
      
      return response
    } catch (error: any) {
      console.error('[HyperliquidService] Place order error:', error)
      throw new Error(`Failed to place order: ${error.message || 'Unknown error'}`)
    }
  }

  async cancelOrder(asset: string, oid: number) {
    const meta = await this.infoClient.meta()
    const assetIndex = meta.universe.findIndex((u: any) => u.name === asset.toUpperCase())
    if (assetIndex === -1) {
      throw new Error(`Unsupported asset for trading: ${asset}`)
    }

    try {
      const response = await this.exchClient.cancel({
        cancels: [{ a: assetIndex, o: oid }]
      })
      return response
    } catch (error: any) {
      console.error('[HyperliquidService] Cancel order error:', error)
      throw new Error(`Failed to cancel order: ${error.message || 'Unknown error'}`)
    }
  }
}

export const hyperliquid = new HyperliquidService()
