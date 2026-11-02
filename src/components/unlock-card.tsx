'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Copy, ExternalLink, Loader2, Zap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  UNLOCK_PRICE_SATS,
  type CheckoutResponse,
  type LicenseDTO,
  type LicenseStatusResponse,
  type SettingsDTO,
} from '@/lib/types'
import { formatSats } from '@/lib/format'
import { fetchJson } from '@/lib/utils'

type Provider = 'demo' | 'lnurl' | 'zaprite'

const POLL_MS = 4000
const POLL_MAX_MS = 20 * 60 * 1000

export function UnlockCard({
  unlocked,
  license,
  role,
  settings,
  onUnlocked,
}: {
  unlocked: boolean
  license: LicenseDTO | null
  role: 'operator' | 'user'
  settings: SettingsDTO | null
  onUnlocked: () => Promise<void>
}) {
  const { toast } = useToast()
  const isOperator = role === 'operator'
  const lnurlOn = isOperator || !!settings?.payments?.lnurl
  const zapriteOn = isOperator || !!settings?.payments?.zaprite
  const configured = !!(settings?.payments?.lnurl || settings?.payments?.zaprite)

  const defaultProvider: Provider = lnurlOn && (settings?.payments?.lnurl || !isOperator)
    ? 'lnurl'
    : zapriteOn && settings?.payments?.zaprite
      ? 'zaprite'
      : isOperator
        ? 'demo'
        : 'lnurl'
  const [provider, setProvider] = useState<Provider>(defaultProvider)
  const [lnOverride, setLnOverride] = useState('')
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [polling, setPolling] = useState(false)
  const pollStart = useRef(0)
  const unlockSats = settings?.unlockSats ?? UNLOCK_PRICE_SATS

  const finish = useCallback(async () => {
    setPolling(false)
    setCheckout(null)
    toast({ title: 'Unlocked 🎉', description: 'Payment received — unlimited invoices enabled.' })
    await onUnlocked()
  }, [onUnlocked, toast])

  // Poll GET /api/license while a payment is pending. The server checks the
  // wallet (LUD-21) / webhook state on each call.
  useEffect(() => {
    if (!polling) return
    let stopped = false
    const iv = setInterval(async () => {
      if (Date.now() - pollStart.current > POLL_MAX_MS) {
        setPolling(false)
        return
      }
      try {
        const s = await fetchJson<LicenseStatusResponse>('/api/license')
        if (!stopped && s.unlocked) await finish()
      } catch {
        // transient — keep polling
      }
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(iv)
    }
  }, [polling, finish])

  const startCheckout = async () => {
    setBusy(true)
    setCheckout(null)
    setPolling(false)
    // Open the Zaprite tab synchronously (popup blockers), then point it at the link.
    const zapTab = provider === 'zaprite' ? window.open('', '_blank') : null
    try {
      const json = await fetchJson<CheckoutResponse>('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          ...(isOperator && provider === 'lnurl' && lnOverride.trim()
            ? { lightningAddress: lnOverride.trim() }
            : {}),
        }),
      })
      if (json.status === 'paid') {
        zapTab?.close()
        await finish()
        return
      }
      setCheckout(json)
      if (json.provider === 'zaprite' && json.payLink) {
        if (zapTab) zapTab.location.href = json.payLink
        else window.open(json.payLink, '_blank', 'noopener')
      }
      pollStart.current = Date.now()
      setPolling(true)
    } catch (err) {
      zapTab?.close()
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const confirmPaid = async (licenseKey: string) => {
    setBusy(true)
    try {
      await fetchJson('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      })
      await finish()
    } catch (err) {
      toast({
        title: 'Not confirmed yet',
        description: err instanceof Error ? err.message : 'Try again shortly.',
      })
    } finally {
      setBusy(false)
    }
  }

  if (unlocked) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <CardTitle>Unlimited invoices active</CardTitle>
          <CardDescription>
            Paid {formatSats(license?.sats ?? unlockSats)} sats via{' '}
            {license?.provider === 'demo'
              ? 'sandbox checkout'
              : license?.provider === 'zaprite'
                ? 'Zaprite'
                : 'Lightning'}
            {license?.paidAt ? ` on ${new Date(license.paidAt).toLocaleDateString('en-GB')}` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-xs text-muted-foreground">
            License <span className="font-mono">{license?.key}</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  const optionClass =
    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent'

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
            <Zap className="h-6 w-6 text-orange-600" fill="currentColor" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">
            <span className="font-mono">{formatSats(unlockSats)}</span> <span className="text-lg">sats</span>{' '}
            <Badge variant="secondary" className="ml-1">
              one-time
            </Badge>
          </CardTitle>
          <CardDescription>
            Unlock unlimited invoices forever. Pay over Lightning: no card, no subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as Provider)} className="grid gap-3">
            {lnurlOn ? (
              <Label htmlFor="p-lnurl" className={optionClass}>
                <RadioGroupItem value="lnurl" id="p-lnurl" className="mt-0.5" />
                <div>
                  <p className="font-medium">Lightning invoice</p>
                  <p className="text-sm text-muted-foreground">
                    Scan a QR with any Lightning wallet. Unlocks automatically once paid.
                  </p>
                </div>
              </Label>
            ) : null}
            {zapriteOn ? (
              <Label htmlFor="p-zaprite" className={optionClass}>
                <RadioGroupItem value="zaprite" id="p-zaprite" className="mt-0.5" />
                <div>
                  <p className="font-medium">Zaprite checkout</p>
                  <p className="text-sm text-muted-foreground">
                    Hosted payment page (Lightning or on-chain), confirmed by webhook.
                  </p>
                </div>
              </Label>
            ) : null}
            {isOperator ? (
              <Label htmlFor="p-demo" className={optionClass}>
                <RadioGroupItem value="demo" id="p-demo" className="mt-0.5" />
                <div>
                  <p className="font-medium">Simulate payment (operator sandbox)</p>
                  <p className="text-sm text-muted-foreground">
                    Unlocks your own account instantly, so you can test the flow without a wallet.
                  </p>
                </div>
              </Label>
            ) : null}
          </RadioGroup>

          {!configured ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {isOperator
                ? 'Unlock payments are not set up yet. Add your Lightning Address or Zaprite link in Settings (gear icon) so users can pay you.'
                : 'Unlock payments are not set up on this site yet. The site operator needs to add a Lightning Address.'}
            </p>
          ) : null}

          {provider === 'lnurl' && isOperator ? (
            <div className="space-y-1.5">
              <Label htmlFor="unlock-ln">Test with another Lightning Address (optional)</Label>
              <Input
                id="unlock-ln"
                placeholder={settings?.lightningAddress ?? 'you@wallet.com'}
                value={lnOverride}
                onChange={(e) => setLnOverride(e.target.value)}
              />
            </div>
          ) : null}

          <Button onClick={startCheckout} disabled={busy} className="w-full" size="lg">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" fill="currentColor" />
            )}
            {provider === 'demo'
              ? 'Simulate payment'
              : provider === 'lnurl'
                ? 'Generate Lightning invoice'
                : 'Open Zaprite checkout'}
          </Button>
        </CardContent>
      </Card>

      {checkout?.provider === 'lnurl' && checkout.paymentRequest ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <p className="text-sm font-medium">
              Pay <span className="font-mono">{formatSats(unlockSats)} sats</span> with any Lightning wallet
            </p>
            <a
              href={`lightning:${checkout.paymentRequest}`}
              className="rounded-lg border bg-white p-3"
              aria-label="Open in Lightning wallet"
            >
              <QRCodeSVG
                value={`lightning:${checkout.paymentRequest.toUpperCase()}`}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#171717"
              />
            </a>
            <p className="w-full truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {checkout.paymentRequest}
            </p>
            <PollingNote polling={polling} auto={checkout.autoConfirm} />
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(checkout.paymentRequest ?? '')
                    toast({ title: 'Copied', description: 'Lightning invoice copied.' })
                  } catch {
                    toast({ title: 'Copy failed', description: 'Select the invoice text and copy it manually.' })
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy invoice
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => confirmPaid(checkout.licenseKey)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                I&apos;ve paid, check now
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {checkout?.provider === 'zaprite' && checkout.payLink ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm">
              Complete the payment in the Zaprite tab. This page unlocks automatically when Zaprite confirms it.
            </p>
            <PollingNote polling={polling} auto />
            {isOperator && checkout.webhookUrl ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Operator: Zaprite must send its webhook to this URL (add <code>?secret=…</code> if you set
                  ZAPRITE_WEBHOOK_SECRET):
                </p>
                <code className="block overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs">
                  {checkout.webhookUrl}
                </code>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" asChild>
                <a href={checkout.payLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Reopen Zaprite
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => confirmPaid(checkout.licenseKey)}
              >
                I&apos;ve paid, check now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Reference: <span className="font-mono">{checkout.licenseKey}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function PollingNote({ polling, auto }: { polling: boolean; auto?: boolean }) {
  if (!polling) return null
  return (
    <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-live="polite">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      {auto ? 'Waiting for payment… this unlocks automatically.' : 'Waiting for payment…'}
    </p>
  )
}
