'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIAT_SYMBOLS, type FiatCurrency, type LineItem } from '@/lib/types'
import { formatDate, formatFiatPlain, formatSats, invoiceTotals } from '@/lib/format'

export type InvoiceDocData = {
  number?: string | null
  senderName: string
  senderDetails?: string
  clientName: string
  clientDetails?: string
  currency: FiatCurrency
  fxRate: number
  items: LineItem[]
  notes?: string | null
  dueDate?: string | null
  lightningAddress?: string | null
  totalFiat: number
  totalSats: number
  status?: string
  createdAt?: string | null
  vatRate?: number | null
  paidAt?: string | null
  paidFxRate?: number | null
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-neutral-200 text-neutral-700' },
  sent: { label: 'SENT', className: 'bg-amber-100 text-amber-800' },
  paid: { label: 'PAID', className: 'bg-emerald-100 text-emerald-800' },
}

export function InvoiceDocument({
  data,
  isPreview = false,
  className,
  brandName = 'SatInvoice',
}: {
  data: InvoiceDocData
  isPreview?: boolean
  className?: string
  /** White-label footer credit (the operator's instance name) */
  brandName?: string
}) {
  const symbol = FIAT_SYMBOLS[data.currency] ?? ''
  const status = data.status ? STATUS_LABEL[data.status] : undefined
  const { subtotal, vat } = invoiceTotals(data.items, data.vatRate)
  const hasVat = !!data.vatRate && data.vatRate > 0
  const fmtRate = (n: number) => `${symbol}${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`
  const issued = data.createdAt ? formatDate(data.createdAt) : 'the issue date'
  const paidValue =
    data.status === 'paid' && data.paidFxRate ? (data.totalSats / 1e8) * data.paidFxRate : null

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-3xl rounded-lg border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm sm:p-10',
        className
      )}
      style={{ colorScheme: 'light' }}
      aria-label="Invoice document"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-orange-500 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500">
              <Zap className="h-5 w-5 text-white" fill="currentColor" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">INVOICE</h2>
          </div>
          <p className="mt-2 font-mono text-sm text-neutral-500">
            {data.number ? data.number : 'PREVIEW'}
            {isPreview && data.number ? ' (draft)' : ''}
          </p>
        </div>
        <div className="text-right">
          {status ? (
            <span
              className={cn(
                'inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
                status.className
              )}
            >
              {status.label}
            </span>
          ) : (
            <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold tracking-wide text-orange-700">
              PREVIEW — SAVE TO ISSUE
            </span>
          )}
          <div className="mt-2 space-y-0.5 text-sm text-neutral-600">
            <p>
              Issued: <span className="font-medium text-neutral-900">{formatDate(data.createdAt ?? new Date().toISOString())}</span>
            </p>
            <p>
              Due: <span className="font-medium text-neutral-900">{data.dueDate ? formatDate(data.dueDate) : 'On receipt'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">From</p>
          <p className="mt-1 font-semibold">{data.senderName || '—'}</p>
          {data.senderDetails ? (
            <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">{data.senderDetails}</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Bill to</p>
          <p className="mt-1 font-semibold">{data.clientName || '—'}</p>
          {data.clientDetails ? (
            <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">{data.clientDetails}</p>
          ) : null}
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500">
            <th className="py-2 pr-2 font-semibold">Description</th>
            <th className="py-2 pr-2 text-right font-semibold">Qty</th>
            <th className="py-2 pr-2 text-right font-semibold">Unit ({symbol})</th>
            <th className="py-2 text-right font-semibold">Amount ({symbol})</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="border-b border-neutral-100">
              <td className="py-2.5 pr-2 align-top">{item.description}</td>
              <td className="py-2.5 pr-2 text-right align-top tabular-nums">{item.quantity}</td>
              <td className="py-2.5 pr-2 text-right align-top tabular-nums">
                {item.unitPrice.toFixed(2)}
              </td>
              <td className="py-2.5 text-right align-top font-medium tabular-nums">
                {(item.quantity * item.unitPrice).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-1.5 text-sm">
          {hasVat ? (
            <>
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="tabular-nums text-neutral-900">{formatFiatPlain(subtotal, data.currency)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>VAT ({data.vatRate}%)</span>
                <span className="tabular-nums text-neutral-900">{formatFiatPlain(vat, data.currency)}</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between text-neutral-600">
            <span>Total ({data.currency}){hasVat ? ' incl. VAT' : ''}</span>
            <span className="font-semibold tabular-nums text-neutral-900">
              {formatFiatPlain(data.totalFiat, data.currency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between rounded-md bg-orange-50 px-3 py-2.5 text-orange-900">
            <span className="font-medium">≈ Pay in sats</span>
            <span className="font-mono text-lg font-bold tabular-nums">
              {formatSats(data.totalSats)} <span className="text-sm font-semibold">sats</span>
            </span>
          </div>
          {data.fxRate > 0 ? (
            <p className="text-right text-xs leading-relaxed text-neutral-400">
              Sats calculated at 1 BTC = {fmtRate(data.fxRate)} on {issued}.
              <br />
              The {data.currency} total is the amount owed.
            </p>
          ) : null}
          {paidValue !== null && data.paidFxRate ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-right text-xs text-emerald-800">
              Paid {data.paidAt ? formatDate(data.paidAt) : ''}: {formatSats(data.totalSats)} sats were worth{' '}
              <span className="font-semibold">{formatFiatPlain(paidValue, data.currency)}</span> at 1 BTC ={' '}
              {fmtRate(data.paidFxRate)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Payment QR + notes */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-6 border-t border-neutral-200 pt-6">
        {data.status === 'paid' ? (
          <div className="text-sm font-medium text-emerald-700">Paid — thank you.</div>
        ) : data.lightningAddress ? (
          <div className="flex items-center gap-4">
            <div className="rounded-md border border-neutral-200 bg-white p-2">
              <QRCodeSVG
                value={data.lightningAddress}
                size={104}
                level="M"
                bgColor="#ffffff"
                fgColor="#171717"
              />
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-orange-600">
                <Zap className="h-3 w-3" fill="currentColor" aria-hidden="true" /> Lightning payment
              </p>
              <p className="mt-1 font-mono text-sm font-medium break-all">{data.lightningAddress}</p>
              <p className="mt-1 text-xs text-neutral-500">Scan with any Lightning wallet</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Payment by arrangement.</div>
        )}
        {data.notes ? (
          <div className="max-w-xs text-sm text-neutral-600">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Notes</p>
            <p className="mt-1 whitespace-pre-line">{data.notes}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-6 border-t border-neutral-100 pt-4 text-center text-xs text-neutral-400">
        Issued with {brandName} ⚡ — invoices on a bitcoin standard
      </p>
    </div>
  )
}
