'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { FIAT_CURRENCIES, FIAT_SYMBOLS, type FiatCurrency, type SettingsDTO } from '@/lib/types'
import { fetchJson } from '@/lib/utils'
import { Loader2, Settings2 } from 'lucide-react'

export function SettingsDialog({
  settings,
  role,
  onSaved,
}: {
  settings: SettingsDTO | null
  role: 'operator' | 'user'
  onSaved: (s: SettingsDTO) => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lightningAddress, setLightningAddress] = useState('')
  const [zapriteLink, setZapriteLink] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<FiatCurrency>('GBP')
  const [unlockSats, setUnlockSats] = useState('')
  const [freeInvoices, setFreeInvoices] = useState('')
  const [brandName, setBrandName] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [walletReferralUrl, setWalletReferralUrl] = useState('')
  const isOperator = role === 'operator'

  useEffect(() => {
    if (!settings) return
    const t = setTimeout(() => {
      setLightningAddress(settings.lightningAddress ?? '')
      setZapriteLink(settings.zapriteLink ?? '')
      setDefaultCurrency(settings.defaultCurrency)
      setUnlockSats(String(settings.unlockSats ?? ''))
      setFreeInvoices(String(settings.freeInvoices ?? ''))
      setBrandName(settings.brandName ?? '')
      setBrandLogo(settings.brandLogo ?? '')
      setWalletReferralUrl(settings.walletReferralUrl ?? '')
    }, 0)
    return () => clearTimeout(t)
  }, [settings, open])

  const save = async () => {
    setBusy(true)
    try {
      // Regular users only touch their own preferences — sending operator
      // fields would be rejected. Operators send the full instance config.
      const payload: Record<string, unknown> = { defaultCurrency }
      if (isOperator) {
        payload.lightningAddress = lightningAddress
        payload.zapriteLink = zapriteLink
        payload.unlockSats = unlockSats.trim()
        payload.freeInvoices = freeInvoices.trim()
        payload.brandName = brandName
        payload.brandLogo = brandLogo
        payload.walletReferralUrl = walletReferralUrl
      }
      const json = await fetchJson<SettingsDTO>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onSaved(json)
      toast({ title: 'Settings saved' })
      setOpen(false)
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            {isOperator
              ? 'Configure your payment destination, the instance pricing and the white-label brand.'
              : 'Your personal invoicing preferences. Unlock payment and branding settings belong to the site operator.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isOperator ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="set-ln">Your Lightning Address</Label>
                <Input
                  id="set-ln"
                  placeholder="you@wallet.com"
                  value={lightningAddress}
                  onChange={(e) => setLightningAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Every unlock payment from your users lands here (checked live via LUD-21 when your wallet supports it).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-zaprite">Zaprite payment link</Label>
                <Input
                  id="set-zaprite"
                  placeholder="https://checkout.zaprite.com/…"
                  value={zapriteLink}
                  onChange={(e) => setZapriteLink(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Hosted checkout for the unlock. Add the webhook in Zaprite for auto-confirm.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="set-unlock">Unlock price (sats)</Label>
                  <Input
                    id="set-unlock"
                    type="number"
                    min={1000}
                    step={1000}
                    value={unlockSats}
                    onChange={(e) => setUnlockSats(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-free">Free invoices</Label>
                  <Input
                    id="set-free"
                    type="number"
                    min={0}
                    max={1000}
                    value={freeInvoices}
                    onChange={(e) => setFreeInvoices(e.target.value)}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Your reseller terms: every new account gets this many free invoices, then pays your
                unlock price once to go unlimited.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="set-brand">Brand name (white-label)</Label>
                <Input
                  id="set-brand"
                  placeholder="SatInvoice"
                  maxLength={40}
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown across the app, on client invoice pages and the printed footer. Empty =
                  SatInvoice.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-logo">Logo image URL</Label>
                <Input
                  id="set-logo"
                  placeholder="https://your-domain.com/logo.png"
                  value={brandLogo}
                  onChange={(e) => setBrandLogo(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Replaces the bolt in the header. Square image works best; a broken URL falls back
                  to the bolt.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-referral">Wallet referral link</Label>
                <Input
                  id="set-referral"
                  placeholder="https://getalby.com/invited-by/…"
                  value={walletReferralUrl}
                  onChange={(e) => setWalletReferralUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown as &quot;Get a free wallet&quot; to users and clients without Lightning (invoice form,
                  unlock panel, client invoice page, PDF and email). Clear it to restore the default.
                </p>
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label>Default invoicing currency</Label>
            <Select value={defaultCurrency} onValueChange={(v) => setDefaultCurrency(v as FiatCurrency)}>
              <SelectTrigger aria-label="Default currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIAT_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {FIAT_SYMBOLS[c]} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
