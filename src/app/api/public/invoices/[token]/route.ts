import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getInstanceConfig } from '@/lib/settings'
import { type FiatCurrency, type InvoiceDTO, type LineItem } from '@/lib/types'
import { creditFor } from '@/lib/credit'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/invoices/[token]
 * Read-only invoice payload for the public share page (?i=token).
 * Access is via the unguessable 32-char hex token — no auth, nothing else
 * exposed. Returns an explicit whitelist of client-safe fields (never the
 * ownerId or internal bookkeeping).
 */
async function GET__impl(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!/^[0-9a-f]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const inv = await db.invoice.findUnique({ where: { shareToken: token } })
  if (!inv) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const dto: InvoiceDTO = {
    id: inv.id,
    number: inv.number,
    senderName: inv.senderName,
    senderDetails: inv.senderDetails,
    clientName: inv.clientName,
    clientDetails: inv.clientDetails,
    currency: inv.currency as FiatCurrency,
    fxRate: inv.fxRate,
    items: JSON.parse(inv.items) as LineItem[],
    notes: inv.notes,
    dueDate: inv.dueDate,
    lightningAddress: inv.lightningAddress,
    status: inv.status as InvoiceDTO['status'],
    totalFiat: inv.totalFiat,
    totalSats: inv.totalSats,
    vatRate: inv.vatRate,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    paidFxRate: inv.paidFxRate,
    createdAt: inv.createdAt.toISOString(),
  }

  // Public branding lets the share page wear the operator's white-label.
  const cfg = await getInstanceConfig()
  return NextResponse.json({
    ...dto,
    brandName: cfg.brandName,
    brandLogo: cfg.brandLogo,
    walletReferralUrl: cfg.walletReferralUrl,
    credit: await creditFor(inv.ownerId, req),
  })
}


export const GET = withApi(GET__impl)