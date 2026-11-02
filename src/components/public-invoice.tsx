'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { InvoiceDocument, type InvoiceDocData } from '@/components/invoice-document'
import { BrandMark } from '@/components/brand-mark'
import type { PublicInvoiceResponse } from '@/lib/types'
import { fetchJson } from '@/lib/utils'
import { FileQuestion, Loader2, Printer } from 'lucide-react'

/**
 * Client-facing read-only invoice page, reachable via /?i=<shareToken>.
 * The link is printed inside every invoice email ("View invoice online").
 * It wears the operator's white-label brand returned by the public API.
 */
export function PublicInvoiceView({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [invoice, setInvoice] = useState<PublicInvoiceResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const data = await fetchJson<PublicInvoiceResponse>(
          `/api/public/invoices/${encodeURIComponent(token)}`
        )
        if (cancelled) return
        setInvoice(data)
        setState('ready')
        document.title = `Invoice ${data.number} · ${data.brandName || 'SatInvoice'}`
      } catch {
        if (!cancelled) setState('missing')
      }
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [token])

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading invoice…</p>
      </div>
    )
  }

  if (state === 'missing' || !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FileQuestion className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Invoice link not valid</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            This invoice doesn&apos;t exist, or the link has expired or been revoked. Ask the
            sender for a fresh invoice email.
          </p>
        </div>
        <a
          href="/"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Create your own bitcoin invoices →
        </a>
      </div>
    )
  }

  const doc: InvoiceDocData = {
    number: invoice.number,
    senderName: invoice.senderName,
    senderDetails: invoice.senderDetails,
    clientName: invoice.clientName,
    clientDetails: invoice.clientDetails,
    currency: invoice.currency,
    fxRate: invoice.fxRate,
    items: invoice.items,
    notes: invoice.notes,
    dueDate: invoice.dueDate,
    lightningAddress: invoice.lightningAddress,
    totalFiat: invoice.totalFiat,
    totalSats: invoice.totalSats,
    // Clients never see "draft" — a shared invoice is, to them, an issued one.
    status: invoice.status === 'draft' ? 'sent' : invoice.status,
    createdAt: invoice.createdAt,
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Slim header */}
      <header className="border-b print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <BrandMark
            name={invoice.brandName || 'SatInvoice'}
            logo={invoice.brandLogo}
            size="sm"
          />
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className="mb-4 text-center text-sm text-muted-foreground print:hidden">
            {invoice.senderName} sent you this invoice — pay in sats via the Lightning QR below.
          </p>
          <div id="invoice-print">
            <InvoiceDocument data={doc} brandName={invoice.brandName || undefined} />
          </div>
        </motion.div>
      </main>

      <footer className="mt-auto border-t py-4 print:hidden">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
          Powered by {invoice.brandName || 'SatInvoice'} ⚡ — invoices on a bitcoin standard.{' '}
          <a href="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Create your own →
          </a>
        </div>
      </footer>
    </div>
  )
}
