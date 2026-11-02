'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { buildInvoiceEmail } from '@/lib/email-template'
import type { InvoiceDTO } from '@/lib/types'
import { formatSats } from '@/lib/format'
import { fetchJson, type FetchJsonError } from '@/lib/utils'
import { AlertTriangle, Copy, ExternalLink, Loader2, Mail, Send } from 'lucide-react'

type EmailStatus = { configured: boolean; from: string | null }

function firstEmailIn(text: string): string {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return m ? m[0] : ''
}

export function SendEmailDialog({
  invoice,
  onClose,
  onSent,
}: {
  invoice: InvoiceDTO | null
  onClose: () => void
  onSent: () => Promise<void>
}) {
  const { toast } = useToast()
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  // Defer the status fetch + field prefill to avoid sync setState in effects.
  useEffect(() => {
    if (!invoice) return
    const t = setTimeout(async () => {
      setTo(firstEmailIn(invoice.clientDetails))
      setMessage(
        `Hi ${invoice.clientName},\n\nPlease find invoice ${invoice.number} below — ${invoice.totalFiat.toFixed(2)} ${invoice.currency} ≈ ${formatSats(invoice.totalSats)} sats.\n\nThanks!`
      )
      setShareUrl(null)
      try {
        setStatus(await fetchJson<EmailStatus>('/api/email/status'))
      } catch {
        setStatus({ configured: false, from: null })
      }
      // Ensure the public page exists so the preview matches the sent email.
      try {
        const sj = await fetchJson<{ url?: string }>(`/api/invoices/${invoice.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: window.location.origin }),
        })
        setShareUrl(sj.url ?? null)
      } catch {
        // share link is best-effort
      }
    }, 0)
    return () => clearTimeout(t)
  }, [invoice])

  const built = useMemo(
    () => (invoice ? buildInvoiceEmail(invoice, message, shareUrl ?? undefined) : null),
    [invoice, message, shareUrl]
  )

  const send = async () => {
    if (!invoice) return
    setBusy(true)
    try {
      await fetchJson<unknown>(
        `/api/invoices/${invoice.id}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, message, origin: window.location.origin }),
        }
      )
      toast({ title: 'Email sent', description: `${invoice.number} delivered to ${to}.` })
      await onSent()
      onClose()
    } catch (err) {
      // Surface SMTP misconfiguration immediately (flips the dialog to mailto mode).
      const e = err as FetchJsonError
      const body = (e.data ?? {}) as { error?: string }
      if (body.error === 'smtp_not_configured') {
        setStatus((s) => ({ ...(s ?? { configured: false, from: null }), configured: false }))
      }
      toast({
        title: 'Could not send',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const mailto = useMemo(() => {
    if (!built) return ''
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(built.subject)}&body=${encodeURIComponent(built.text)}`
  }, [built, to])

  const smtpReady = status?.configured === true

  const copyText = async () => {
    if (!built) return
    try {
      await navigator.clipboard.writeText(`Subject: ${built.subject}\n\n${built.text}`)
      toast({ title: 'Copied', description: 'Email text copied to clipboard.' })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access — select the text manually.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Email invoice {invoice?.number}
          </DialogTitle>
          <DialogDescription>
            Send a bitcoin-ready invoice straight to your client&apos;s inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="client@company.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                The email includes the full invoice, the sats total and the Lightning payment
                details.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-msg">Personal message (optional)</Label>
            <Textarea
              id="email-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {status && !status.configured ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Direct sending not configured</AlertTitle>
              <AlertDescription className="text-amber-800">
                <p>
                  One-click sending needs{' '}
                  <code className="font-mono text-xs">SMTP_HOST</code>,{' '}
                  <code className="font-mono text-xs">SMTP_PORT</code>,{' '}
                  <code className="font-mono text-xs">SMTP_USER</code>,{' '}
                  <code className="font-mono text-xs">SMTP_PASS</code> and{' '}
                  <code className="font-mono text-xs">MAIL_FROM</code> on the deployment. Use your
                  own email app meanwhile — the buttons below hand it the exact invoice email.
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="compose" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">Actions</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="compose" className="mt-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                {smtpReady ? (
                  <Button onClick={send} disabled={busy || !to} className="flex-1">
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send via email
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    title="Configure SMTP on the deployment to enable one-click sending"
                    className="flex-1"
                  >
                    <Send className="mr-2 h-4 w-4" /> Send via email
                  </Button>
                )}
                <Button variant={smtpReady ? 'outline' : 'default'} className="flex-1" asChild>
                  <a href={mailto}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in email app
                  </a>
                </Button>
                <Button variant="outline" onClick={copyText}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-2">Copy text</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {smtpReady
                  ? 'Sends the invoice email straight from this deployment.'
                  : '\u201cOpen in email app\u201d drafts the exact invoice email in your mail client — add SMTP credentials on the deployment for one-click sending.'}
              </p>
            </TabsContent>
            <TabsContent value="preview" className="mt-3">
              <div className="max-h-72 overflow-y-auto rounded-lg border bg-neutral-100 p-2">
                {built ? (
                  <div dangerouslySetInnerHTML={{ __html: built.html }} />
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
