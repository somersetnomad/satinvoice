import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

type ZapriteWebhookPayload = {
  status?: string
  state?: string
  orderId?: string
  orderUuid?: string
  reference?: string
  metaData?: { licenseKey?: string } | null
  metadata?: { licenseKey?: string } | null
  licenseKey?: string
  data?: ZapriteWebhookPayload
}

const PAID_STATES = new Set(['paid', 'complete', 'completed', 'settled', 'confirmed'])

function secretMatches(req: Request): boolean {
  const expected = process.env.ZAPRITE_WEBHOOK_SECRET?.trim()
  if (!expected) return true // not configured → open endpoint (see DEPLOY.md)
  const url = new URL(req.url)
  const given = url.searchParams.get('secret') ?? req.headers.get('x-webhook-secret') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * POST /api/webhooks/zaprite — public. Marks the matching pending Zaprite
 * license as paid. Accepts flexible payload shapes. Unknown orders are
 * acknowledged with 200 { matched: false } so Zaprite stops retrying.
 * Set ZAPRITE_WEBHOOK_SECRET and register the URL as
 * https://<domain>/api/webhooks/zaprite?secret=<value> to stop forged calls.
 */
async function POST__impl(req: Request) {
  if (!secretMatches(req)) {
    return NextResponse.json({ ok: false, error: 'invalid_webhook_secret' }, { status: 401 })
  }

  const raw = ((await req.json()) ?? {}) as ZapriteWebhookPayload
  const payload: ZapriteWebhookPayload = { ...(raw.data ?? {}), ...raw }

  const state = String(payload.status ?? payload.state ?? '').toLowerCase()
  const licenseKey = payload.licenseKey ?? payload.metaData?.licenseKey ?? payload.metadata?.licenseKey
  const reference = payload.orderId ?? payload.orderUuid ?? payload.reference

  let license = licenseKey
    ? await db.license.findFirst({ where: { key: String(licenseKey), provider: 'zaprite' } })
    : null
  if (!license && reference) {
    const ref = String(reference)
    license =
      (await db.license.findFirst({ where: { reference: ref, provider: 'zaprite' } })) ??
      (await db.license.findFirst({ where: { key: ref, provider: 'zaprite' } }))
  }

  if (!license) {
    console.log('[zaprite-webhook] no matching license', JSON.stringify(payload).slice(0, 2000))
    return NextResponse.json({ ok: true, matched: false })
  }

  if (PAID_STATES.has(state) && license.status !== 'paid') {
    await db.license.update({
      where: { id: license.id },
      data: { status: 'paid', paidAt: new Date() },
    })
    console.log(`[zaprite-webhook] license ${license.key} marked paid (state=${state})`)
  }
  return NextResponse.json({ ok: true, matched: true, paid: PAID_STATES.has(state) || license.status === 'paid' })
}

export const POST = withApi(POST__impl)
