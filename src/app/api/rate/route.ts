import { NextResponse } from 'next/server'
import type { FiatCurrency, RateResponse } from '@/lib/types'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

type CachedRate = { data: RateResponse; ts: number }
let cache: CachedRate | null = null
const CACHE_MS = 5 * 60 * 1000
const CURRENCIES: FiatCurrency[] = ['GBP', 'USD', 'EUR']

async function fetchBlockchainInfo(): Promise<Partial<Record<FiatCurrency, number>>> {
  const res = await fetch('https://blockchain.info/ticker', {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`blockchain.info ${res.status}`)
  const json = (await res.json()) as Record<string, { last?: number }>
  const out: Partial<Record<FiatCurrency, number>> = {}
  for (const c of CURRENCIES) {
    const last = json[c]?.last
    if (typeof last === 'number' && last > 0) out[c] = last
  }
  return out
}

async function fetchCoinGecko(): Promise<Partial<Record<FiatCurrency, number>>> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=gbp,usd,eur',
    { cache: 'no-store', signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`coingecko ${res.status}`)
  const json = (await res.json()) as { bitcoin?: Record<string, number> }
  const b = json.bitcoin ?? {}
  const out: Partial<Record<FiatCurrency, number>> = {}
  const map: Record<FiatCurrency, string> = { GBP: 'gbp', USD: 'usd', EUR: 'eur' }
  for (const c of CURRENCIES) {
    const v = b[map[c]]
    if (typeof v === 'number' && v > 0) out[c] = v
  }
  return out
}

async function GET__impl() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data)
  }
  const sources: Array<[string, () => Promise<Partial<Record<FiatCurrency, number>>>]> = [
    ['blockchain.info', fetchBlockchainInfo],
    ['coingecko', fetchCoinGecko],
  ]
  for (const [name, fn] of sources) {
    try {
      const rates = await fn()
      if (Object.keys(rates).length > 0) {
        const data: RateResponse = {
          rates,
          source: name,
          fetchedAt: new Date().toISOString(),
        }
        cache = { data, ts: Date.now() }
        return NextResponse.json(data)
      }
    } catch {
      // try next source
    }
  }
  return NextResponse.json(
    { error: 'rate_unavailable', message: 'Live BTC rate unavailable — enter a rate manually.' },
    { status: 502 }
  )
}


export const GET = withApi(GET__impl)