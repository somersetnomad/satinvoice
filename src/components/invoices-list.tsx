'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FIAT_SYMBOLS, type InvoiceDTO } from '@/lib/types'
import { formatDate, formatSats } from '@/lib/format'
import { fetchJson } from '@/lib/utils'
import { FileDown, FileText, Link2, Mail, Pencil, Printer, RefreshCw, Send, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { InvoiceDocData } from './invoice-document'

function statusBadge(status: InvoiceDTO['status']) {
  if (status === 'paid')
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>
    )
  if (status === 'sent')
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Sent</Badge>
  return <Badge variant="secondary">Draft</Badge>
}

export function InvoicesList({
  invoices,
  onPrint,
  onEmail,
  onStatusChange,
  onDelete,
  onEdit,
  onReprice,
}: {
  invoices: InvoiceDTO[]
  onEdit: (invoice: InvoiceDTO) => void
  onReprice: (invoice: InvoiceDTO) => Promise<void>
  onPrint: (data: InvoiceDocData) => void
  onEmail: (invoice: InvoiceDTO) => void
  onStatusChange: (id: string, status: 'draft' | 'sent' | 'paid') => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [pendingDelete, setPendingDelete] = useState<InvoiceDTO | null>(null)
  const { toast } = useToast()
  const [linkBusy, setLinkBusy] = useState<string | null>(null)

  const copyShareLink = async (inv: InvoiceDTO) => {
    setLinkBusy(inv.id)
    try {
      const json = await fetchJson<{ url?: string }>(`/api/invoices/${inv.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      })
      if (!json.url) throw new Error('Could not create link')
      try {
        await navigator.clipboard.writeText(json.url)
        toast({ title: 'Public link copied', description: json.url })
      } catch {
        toast({ title: 'Share link ready', description: json.url })
      }
    } catch (err) {
      toast({
        title: 'Could not create link',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLinkBusy(null)
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-3 font-medium">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first sats-denominated invoice in the Create tab.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const symbol = FIAT_SYMBOLS[inv.currency] ?? ''
        const toInvoiceDoc = (): InvoiceDocData => ({
          number: inv.number,
          senderName: inv.senderName,
          senderDetails: inv.senderDetails,
          clientName: inv.clientName,
          clientDetails: inv.clientDetails,
          currency: inv.currency,
          fxRate: inv.fxRate,
          items: inv.items,
          notes: inv.notes,
          dueDate: inv.dueDate,
          lightningAddress: inv.lightningAddress,
          totalFiat: inv.totalFiat,
          totalSats: inv.totalSats,
          status: inv.status,
          createdAt: inv.createdAt,
          vatRate: inv.vatRate,
          paidAt: inv.paidAt,
          paidFxRate: inv.paidFxRate,
        })
        return (
          <Card key={inv.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{inv.number}</span>
                  {statusBadge(inv.status)}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{inv.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  Issued {formatDate(inv.createdAt)} · Due {inv.dueDate ? formatDate(inv.dueDate) : 'on receipt'}
                </p>
                {inv.sentTo ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" aria-hidden="true" /> Emailed to {inv.sentTo}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {symbol}
                    {inv.totalFiat.toLocaleString('en-GB', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="font-mono text-sm text-primary">
                    {formatSats(inv.totalSats)} sats
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {inv.status === 'draft' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(inv.id, 'sent')}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Mark sent
                    </Button>
                  ) : inv.status === 'sent' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(inv.id, 'paid')}
                    >
                      <Wallet className="mr-1.5 h-3.5 w-3.5" /> Mark paid
                    </Button>
                  ) : null}
                  {inv.status !== 'paid' ? (
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Re-price ${inv.number} at today's BTC rate`}
                      title="Re-price sats at today's BTC rate (the amount owed doesn't change)"
                      onClick={() => onReprice(inv)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Edit ${inv.number}`}
                    title="Edit invoice"
                    onClick={() => onEdit(inv)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Copy public link for ${inv.number}`}
                    title="Copy public link — a web page your client can open"
                    disabled={linkBusy === inv.id}
                    onClick={() => copyShareLink(inv)}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Email ${inv.number}`}
                    onClick={() => onEmail(inv)}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild title="Download PDF">
                    <a href={`/api/invoices/${inv.id}/pdf`} download aria-label={`Download ${inv.number} as PDF`}>
                      <FileDown className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Print ${inv.number}`}
                    onClick={() => onPrint(toInvoiceDoc())}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${inv.number}`}
                    onClick={() => setPendingDelete(inv)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {pendingDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (pendingDelete) await onDelete(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
