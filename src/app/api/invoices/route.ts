import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { getInstanceConfig } from '@/lib/settings'
import { createInvoiceWithNumber, toInvoiceDTO, validateInvoiceInput, type InvoiceInput } from '@/lib/invoices'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/invoices — the caller's own invoices, newest first. */
async function GET__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  const invoices = await db.invoice.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invoices.map(toInvoiceDTO))
}

/**
 * POST /api/invoices — create a draft invoice.
 * Free tier: without a paid license, accounts get `freeInvoices` invoices,
 * after which this returns 402 payment_required.
 */
async function POST__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  // Parse first: malformed JSON → 400 "Invalid JSON in request body" (withApi).
  const body = (await req.json()) as InvoiceInput | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const cfg = await getInstanceConfig()
  const paidLicense = await db.license.findFirst({
    where: { ownerId: user.id, status: 'paid' },
    select: { id: true },
  })
  if (!paidLicense) {
    const owned = await db.invoice.count({ where: { ownerId: user.id } })
    if (owned >= cfg.freeInvoices) {
      return NextResponse.json(
        {
          error: 'payment_required',
          message: `Free plan includes ${cfg.freeInvoices} invoices. Unlock unlimited for ${cfg.unlockSats.toLocaleString('en-GB')} sats.`,
          freeLimit: cfg.freeInvoices,
          unlockSats: cfg.unlockSats,
        },
        { status: 402 }
      )
    }
  }

  const parsed = validateInvoiceInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const created = await createInvoiceWithNumber(user.id, parsed.data)
  return NextResponse.json(toInvoiceDTO(created), { status: 201 })
}

export const GET = withApi(GET__impl)
export const POST = withApi(POST__impl)
