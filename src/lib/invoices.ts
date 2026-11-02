import type { Invoice } from '@prisma/client'
import { db } from '@/lib/db'
import { fiatToSats, invoiceTotals, isValidLightningAddress } from '@/lib/format'
import { FIAT_CURRENCIES, type FiatCurrency, type InvoiceDTO, type LineItem } from '@/lib/types'

/** Shape a DB row for the owner's client. Never includes ownerId. */
export function toInvoiceDTO(inv: Invoice): InvoiceDTO {
  let items: LineItem[] = []
  try {
    const parsed = JSON.parse(inv.items) as unknown
    if (Array.isArray(parsed)) items = parsed as LineItem[]
  } catch {
    items = []
  }
  return {
    id: inv.id,
    number: inv.number,
    senderName: inv.senderName,
    senderDetails: inv.senderDetails,
    clientName: inv.clientName,
    clientDetails: inv.clientDetails,
    currency: inv.currency as FiatCurrency,
    fxRate: inv.fxRate,
    items,
    notes: inv.notes,
    dueDate: inv.dueDate,
    lightningAddress: inv.lightningAddress,
    status: inv.status as InvoiceDTO['status'],
    totalFiat: inv.totalFiat,
    totalSats: inv.totalSats,
    vatRate: inv.vatRate,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    paidFxRate: inv.paidFxRate,
    shareToken: inv.shareToken,
    sentTo: inv.sentTo,
    sentAt: inv.sentAt ? inv.sentAt.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
  }
}

export type InvoiceInput = {
  senderName?: unknown
  senderDetails?: unknown
  clientName?: unknown
  clientDetails?: unknown
  currency?: unknown
  fxRate?: unknown
  items?: unknown
  notes?: unknown
  dueDate?: unknown
  lightningAddress?: unknown
  vatRate?: unknown
}

export type InvoiceFields = {
  senderName: string
  senderDetails: string
  clientName: string
  clientDetails: string
  currency: FiatCurrency
  fxRate: number
  items: string
  notes: string | null
  dueDate: string | null
  lightningAddress: string | null
  vatRate: number | null
  totalFiat: number
  totalSats: number
}

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Validate a full invoice payload (create, or edit with all fields).
 * Returns the DB fields, or a human-readable error for the first invalid field.
 */
export function validateInvoiceInput(
  body: InvoiceInput
): { ok: true; data: InvoiceFields } | { ok: false; error: string } {
  const senderName = str(body.senderName, 200)
  const clientName = str(body.clientName, 200)
  const currency = (str(body.currency) || 'GBP').toUpperCase()
  const fxRate = Number(body.fxRate)

  const rawItems = Array.isArray(body.items) ? body.items : []
  const items: LineItem[] = []
  for (const raw of rawItems as Array<Record<string, unknown>>) {
    const description = str(raw?.description, 500)
    const quantity = Number(raw?.quantity)
    const unitPrice = Number(raw?.unitPrice)
    if (!description && !(quantity > 0 && unitPrice > 0)) continue // blank row
    if (!description) return { ok: false, error: 'Every line item needs a description' }
    if (!Number.isFinite(quantity) || quantity <= 0)
      return { ok: false, error: `Quantity for "${description}" must be greater than 0` }
    if (!Number.isFinite(unitPrice) || unitPrice < 0)
      return { ok: false, error: `Unit price for "${description}" must be 0 or more` }
    items.push({ description, quantity, unitPrice })
  }

  if (!clientName) return { ok: false, error: 'Client name is required' }
  if (!senderName) return { ok: false, error: 'Your name / business is required' }
  if (!FIAT_CURRENCIES.includes(currency as FiatCurrency))
    return { ok: false, error: 'Currency must be GBP, USD or EUR' }
  if (items.length === 0) return { ok: false, error: 'Add at least one line item' }
  if (!Number.isFinite(fxRate) || fxRate <= 0)
    return { ok: false, error: 'A BTC rate is required — use the live rate or enter one manually' }

  const lightningAddress = str(body.lightningAddress, 200) || null
  if (lightningAddress && !isValidLightningAddress(lightningAddress))
    return { ok: false, error: 'Lightning Address must look like name@domain.com' }

  const dueDate = str(body.dueDate, 40) || null
  if (dueDate && Number.isNaN(new Date(dueDate).getTime()))
    return { ok: false, error: 'Due date is not a valid date' }

  let vatRate: number | null = null
  if (body.vatRate !== undefined && body.vatRate !== null && String(body.vatRate).trim() !== '') {
    const v = Number(body.vatRate)
    if (!Number.isFinite(v) || v < 0 || v > 100) return { ok: false, error: 'VAT rate must be between 0 and 100%' }
    vatRate = v > 0 ? Math.round(v * 100) / 100 : null
  }

  const { totalFiat } = invoiceTotals(items, vatRate)

  return {
    ok: true,
    data: {
      senderName,
      senderDetails: str(body.senderDetails),
      clientName,
      clientDetails: str(body.clientDetails),
      currency: currency as FiatCurrency,
      fxRate,
      items: JSON.stringify(items),
      notes: str(body.notes) || null,
      dueDate,
      lightningAddress,
      vatRate,
      totalFiat,
      totalSats: fiatToSats(totalFiat, fxRate),
    },
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

/**
 * Create an invoice with the next number INV-<YYYY>-<0001>, derived from the
 * global invoice count. Deleting invoices lowers the count, so a number can
 * already be taken — on a unique clash we step forward and retry.
 */
export async function createInvoiceWithNumber(ownerId: string, data: InvoiceFields): Promise<Invoice> {
  const year = new Date().getFullYear()
  let seq = (await db.invoice.count()) + 1
  for (let attempt = 0; attempt < 50; attempt++, seq++) {
    const number = `INV-${year}-${String(seq).padStart(4, '0')}`
    try {
      return await db.invoice.create({ data: { ...data, ownerId, number, status: 'draft' } })
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
    }
  }
  // Extremely unlikely; fall back to a timestamped number that cannot clash.
  return db.invoice.create({
    data: { ...data, ownerId, number: `INV-${year}-${Date.now()}`, status: 'draft' },
  })
}
