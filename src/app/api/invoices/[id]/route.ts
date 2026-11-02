import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { toInvoiceDTO, validateInvoiceInput, type InvoiceInput } from '@/lib/invoices'
import { fiatToSats } from '@/lib/format'
import { getLiveRate } from '@/lib/rates'
import type { FiatCurrency } from '@/lib/types'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

const STATUSES = new Set(['draft', 'sent', 'paid'])
const CONTENT_FIELDS = [
  'senderName',
  'senderDetails',
  'clientName',
  'clientDetails',
  'currency',
  'fxRate',
  'items',
  'notes',
  'dueDate',
  'lightningAddress',
  'vatRate',
] as const

type Ctx = { params: Promise<{ id: string }> }

/** Load the invoice only if it belongs to the signed-in user (404 otherwise — never leak existence). */
async function findOwned(id: string, ownerId: string) {
  return db.invoice.findFirst({ where: { id, ownerId } })
}

const notFound = () => NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

/** GET /api/invoices/[id] — one of the caller's invoices. */
async function GET__impl(req: Request, { params }: Ctx) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params
  const owned = await findOwned(id, user.id)
  if (!owned) return notFound()
  return NextResponse.json(toInvoiceDTO(owned))
}

/**
 * PATCH /api/invoices/[id]
 * - `{ status }` changes the lifecycle state (draft | sent | paid)
 * - any content field (client, items, rate…) edits the invoice; edited
 *   content is re-validated as a whole and totals are recomputed server-side
 */
async function PATCH__impl(req: Request, { params }: Ctx) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params

  const body = (await req.json()) as (InvoiceInput & { status?: unknown; reprice?: unknown }) | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const owned = await findOwned(id, user.id)
  if (!owned) return notFound()

  const data: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Status must be draft, sent or paid' }, { status: 400 })
    }
    data.status = body.status
    if (body.status === 'paid' && owned.status !== 'paid') {
      // Record when it was paid and the BTC rate that day, so the GBP value
      // of the sats received is on record for both parties' books.
      data.paidAt = new Date()
      data.paidFxRate = await getLiveRate(owned.currency as FiatCurrency)
    } else if (body.status !== 'paid' && owned.status === 'paid') {
      data.paidAt = null
      data.paidFxRate = null
    }
  }

  if (body.reprice === true) {
    // Re-price the sats amount at today's rate (the fiat amount owed is unchanged).
    if (owned.status === 'paid') {
      return NextResponse.json({ error: 'This invoice is already paid.' }, { status: 400 })
    }
    const rate = await getLiveRate(owned.currency as FiatCurrency)
    if (!rate) {
      return NextResponse.json(
        { error: 'rate_unavailable', message: 'Live BTC rate unavailable right now — try again shortly, or edit the invoice and enter a rate manually.' },
        { status: 502 }
      )
    }
    data.fxRate = rate
    data.totalSats = fiatToSats(owned.totalFiat, rate)
  }

  if (CONTENT_FIELDS.some((f) => body[f] !== undefined)) {
    // Merge the edit over the stored invoice, then validate the result as a whole.
    const current = toInvoiceDTO(owned)
    const merged: InvoiceInput = {}
    for (const f of CONTENT_FIELDS) merged[f] = body[f] !== undefined ? body[f] : current[f]
    const parsed = validateInvoiceInput(merged)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    Object.assign(data, parsed.data)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db.invoice.update({ where: { id: owned.id }, data })
  return NextResponse.json(toInvoiceDTO(updated))
}

/** DELETE /api/invoices/[id] */
async function DELETE__impl(req: Request, { params }: Ctx) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params

  const owned = await findOwned(id, user.id)
  if (!owned) return notFound()

  await db.invoice.delete({ where: { id: owned.id } })
  return NextResponse.json({ ok: true })
}

export const GET = withApi(GET__impl)
export const PATCH = withApi(PATCH__impl)
export const DELETE = withApi(DELETE__impl)
