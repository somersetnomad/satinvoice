import type { FiatCurrency, RateResponse } from '@/lib/types'

/**
 * Live BTC prices with failover (blockchain.info → CoinGecko) and a 5-minute
 * in-memory cache. Shared by GET /api/rate and server features that need the
 * current rate (re-pricing an invoice, recording the rate when it's paid).
 */
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

export async function getLiveRates(): Promise<RateResponse | null> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.data
  const sources: Array<[string, () => Promise<Partial<Record<FiatCurrency, number>>>]> = [
    ['blockchain.info', fetchBlockchainInfo],
    ['coingecko', fetchCoinGecko],
  ]
  for (const [name, fn] of sources) {
    try {
      const rates = await fn()
      if (Object.keys(rates).length > 0) {
        const data: RateResponse = { rates, source: name, fetchedAt: new Date().toISOString() }
        cache = { data, ts: Date.now() }
        return data
      }
    } catch {
      // try next source
    }
  }
  return null
}

/** Current BTC price in one currency, or null if every source is down. */
export async function getLiveRate(currency: FiatCurrency): Promise<number | null> {
  const r = await getLiveRates()
  const v = r?.rates[currency]
  return typeof v === 'number' && v > 0 ? v : null
}
