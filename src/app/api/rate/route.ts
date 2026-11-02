import { NextResponse } from 'next/server'
import { getLiveRates } from '@/lib/rates'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/rate — live BTC price in GBP/USD/EUR (5-minute cache, source failover). */
async function GET__impl() {
  const data = await getLiveRates()
  if (data) return NextResponse.json(data)
  return NextResponse.json(
    { error: 'rate_unavailable', message: 'Live BTC rate unavailable — enter a rate manually.' },
    { status: 502 }
  )
}

export const GET = withApi(GET__impl)
