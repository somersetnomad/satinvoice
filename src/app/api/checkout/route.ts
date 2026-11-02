import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { getInstanceConfig } from '@/lib/settings'
import { type CheckoutResponse } from '@/lib/types'
import { isValidLightningAddress } from '@/lib/format'
import { requestLnurlInvoice } from '@/lib/payments'
import { resolveOrigin } from '@/lib/share'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

async function POST__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  const body = ((await req.json()) ?? {}) as {
    provider?: string
    sats?: number
    lightningAddress?: string
    zapriteLink?: string
  }

  const provider = body.provider ?? ''
  if (!['demo', 'lnurl', 'zaprite'].includes(provider)) {
    return NextResponse.json({ error: 'Unknown payment provider (use lnurl, zaprite or demo)' }, { status: 400 })
  }

  if (provider === 'demo' && user.role !== 'operator') {
    return NextResponse.json(
      { error: 'The sandbox checkout is only available to the site operator.' },
      { status: 403 }
    )
  }

  const alreadyPaid = await db.license.findFirst({
    where: { ownerId: user.id, status: 'paid' },
    select: { key: true },
  })
  if (alreadyPaid) {
    return NextResponse.json({ licenseKey: alreadyPaid.key, status: 'paid', provider })
  }
  // The unlock price is set by the operator (Settings / env) — regular users
  // cannot talk the price down via the request body. Only the operator may
  // pass a custom amount (useful for testing LNURL minimums).
  const cfg = await getInstanceConfig()
  const sats =
    user.role === 'operator' && Number(body.sats) >= 1 && Number(body.sats) <= 1_000_000_000
      ? Math.floor(Number(body.sats))
      : cfg.unlockSats
  const key = `si_${randomBytes(12).toString('hex')}`

  if (provider === 'demo') {
    // The sandbox "payment" is a test fixture — only the site operator may
    // use it to explore the flow. Regular users must actually pay.
    if (user.role !== 'operator') {
      return NextResponse.json(
        { error: 'The sandbox checkout is only available to the site operator.' },
        { status: 403 }
      )
    }
    const license = await db.license.create({
      data: {
        ownerId: user.id,
        key,
        provider,
        sats,
        status: 'paid',
        paidAt: new Date(),
        reference: 'demo',
      },
    })
    const res: CheckoutResponse = {
      licenseKey: license.key,
      status: 'paid',
      provider: 'demo',
    }
    return NextResponse.json(res)
  }

  if (provider === 'lnurl') {
    // Payments ALWAYS go to the operator's wallet. Only the operator may
    // override the destination via the request body.
    const address =
      (user.role === 'operator' ? body.lightningAddress?.trim() : '') ||
      cfg.lightningAddress ||
      ''
    if (!address || !isValidLightningAddress(address)) {
      return NextResponse.json(
        {
          error:
            user.role === 'operator'
              ? 'Set a valid Lightning Address in Settings (or in the Unlock panel) first.'
              : 'Unlock payments are not configured yet — the site operator needs to set a Lightning Address.',
        },
        { status: 400 }
      )
    }
    let invoice: { paymentRequest: string; verifyUrl: string | null }
    try {
      invoice = await requestLnurlInvoice(address, sats)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Lightning wallet request failed' },
        { status: 502 }
      )
    }
    const { paymentRequest, verifyUrl } = invoice
    const license = await db.license.create({
      data: {
        ownerId: user.id,
        key,
        provider,
        sats,
        status: 'pending',
        paymentRequest,
        // LUD-21 verify URL (auto-confirmation) when the wallet offers one.
        reference: verifyUrl ?? address,
      },
    })
    const res: CheckoutResponse = {
      licenseKey: license.key,
      status: 'pending',
      provider: 'lnurl',
      paymentRequest,
      autoConfirm: !!verifyUrl,
    }
    return NextResponse.json(res)
  }

  if (provider === 'zaprite') {
    const link =
      (user.role === 'operator' ? body.zapriteLink?.trim() : '') || cfg.zapriteLink || ''
    if (!link || !/^https?:\/\//.test(link)) {
      return NextResponse.json(
        {
          error:
            user.role === 'operator'
              ? 'Set your Zaprite payment link in Settings first.'
              : 'Unlock payments are not configured yet — the site operator needs to set a Zaprite payment link.',
        },
        { status: 400 }
      )
    }
    const license = await db.license.create({
      data: { ownerId: user.id, key, provider, sats, status: 'pending', reference: key },
    })
    const origin = resolveOrigin(req)
    const res: CheckoutResponse = {
      licenseKey: license.key,
      status: 'pending',
      provider: 'zaprite',
      payLink: link,
      webhookUrl: `${origin}/api/webhooks/zaprite`,
    }
    return NextResponse.json(res)
  }

  return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 })
}


export const POST = withApi(POST__impl)