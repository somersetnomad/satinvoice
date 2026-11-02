'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, RefreshCw, Save, Trash2, X, Zap } from 'lucide-react'
import {
  FIAT_CURRENCIES,
  FIAT_SYMBOLS,
  type FiatCurrency,
  type InvoiceDTO,
  type LineItem,
  type RateResponse,
  type SettingsDTO,
} from '@/lib/types'
import { fiatToSats, formatSats, isValidLightningAddress } from '@/lib/format'
import { WalletReferral } from '@/components/wallet-referral'

export type InvoiceFormPayload = {
  senderName: string
  senderDetails: string
  clientName: string
  clientDetails: string
  currency: FiatCurrency
  fxRate: number
  items: LineItem[]
  notes: string
  dueDate: string
  lightningAddress: string
}

type Props = {
  rate: RateResponse | null
  rateLoading: boolean
  onRefreshRate: () => void
  settings: SettingsDTO | null
  onSave: (payload: InvoiceFormPayload) => Promise<void>
  saving: boolean
  /** When set, the form edits this invoice instead of creating a new one. */
  editing?: InvoiceDTO | null
  onCancelEdit?: () => void
}

type ItemRow = LineItem

const SENDER_KEY = 'satinvoice.sender'
const CLIENT_KEY = 'satinvoice.client'
const LN_KEY = 'satinvoice.ln'

function loadLS<T>(key: string): Partial<T> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? '{}') as Partial<T>
  } catch {
    return {}
  }
}

export function InvoiceForm({
  rate,
  rateLoading,
  onRefreshRate,
  settings,
  onSave,
  saving,
  editing = null,
  onCancelEdit,
}: Props) {
  const [senderName, setSenderName] = useState('')
  const [senderDetails, setSenderDetails] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientDetails, setClientDetails] = useState('')
  const [currency, setCurrency] = useState<FiatCurrency>('GBP')
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lnAddress, setLnAddress] = useState('')

  const [manualRateMode, setManualRateMode] = useState(false)
  const [manualRate, setManualRate] = useState('')

  // Hydrate: an invoice being edited, else the remembered sender/client from
  // localStorage (deferred so we don't setState synchronously in an effect).
  useEffect(() => {
    const t = setTimeout(() => {
      if (editing) {
        setSenderName(editing.senderName)
        setSenderDetails(editing.senderDetails)
        setClientName(editing.clientName)
        setClientDetails(editing.clientDetails)
        setCurrency(editing.currency)
        setItems(editing.items.length ? editing.items.map((i) => ({ ...i })) : [{ description: '', quantity: 1, unitPrice: 0 }])
        setNotes(editing.notes ?? '')
        setDueDate(editing.dueDate ?? '')
        setLnAddress(editing.lightningAddress ?? '')
        // Keep the rate the invoice was issued at; flip Manual off to re-price at the live rate.
        setManualRateMode(true)
        setManualRate(String(editing.fxRate))
        return
      }
      const s = loadLS<{ senderName: string; senderDetails: string }>(SENDER_KEY)
      const c = loadLS<{ clientName: string; clientDetails: string }>(CLIENT_KEY)
      const ln = loadLS<{ lightningAddress: string }>(LN_KEY)
      if (s.senderName) setSenderName(s.senderName)
      if (s.senderDetails) setSenderDetails(s.senderDetails)
      if (c.clientName) setClientName(c.clientName)
      if (c.clientDetails) setClientDetails(c.clientDetails)
      if (ln.lightningAddress) setLnAddress(ln.lightningAddress)
    }, 0)
    return () => clearTimeout(t)
  }, [editing])

  useEffect(() => {
    if (editing) return
    const t = setTimeout(() => {
      if (settings?.defaultCurrency) setCurrency(settings.defaultCurrency)
    }, 0)
    return () => clearTimeout(t)
  }, [settings, editing])

  // No live rate available → switch to manual entry automatically.
  useEffect(() => {
    if (rateLoading || rate) return
    const t = setTimeout(() => setManualRateMode(true), 0)
    return () => clearTimeout(t)
  }, [rate, rateLoading])

  const liveRate = rate?.rates?.[currency]
  const effectiveRate = manualRateMode ? Number(manualRate) || 0 : liveRate || 0

  const totalFiat = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
        0
      ),
    [items]
  )
  const totalSats = fiatToSats(totalFiat, effectiveRate)

  // Persist the full draft so the live preview can mirror it.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        'satinvoice.draft',
        JSON.stringify({
          senderName,
          senderDetails,
          clientName,
          clientDetails,
          currency,
          fxRate: effectiveRate,
          items,
          notes,
          dueDate,
          lightningAddress: lnAddress,
          totalFiat,
          totalSats,
        })
      )
    } catch {
      // ignore quota errors
    }
  }, [
    senderName,
    senderDetails,
    clientName,
    clientDetails,
    currency,
    effectiveRate,
    items,
    notes,
    dueDate,
    lnAddress,
    totalFiat,
    totalSats,
  ])

  const updateItem = (idx: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const addItem = () =>
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])

  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const persistLS = () => {
    try {
      window.localStorage.setItem(
        SENDER_KEY,
        JSON.stringify({ senderName, senderDetails })
      )
      window.localStorage.setItem(
        CLIENT_KEY,
        JSON.stringify({ clientName, clientDetails })
      )
      window.localStorage.setItem(LN_KEY, JSON.stringify({ lightningAddress: lnAddress }))
    } catch {
      // ignore quota errors
    }
  }

  const handleSubmit = async () => {
    if (!editing) persistLS()
    await onSave({
      senderName,
      senderDetails,
      clientName,
      clientDetails,
      currency,
      fxRate: effectiveRate,
      items: items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
      })),
      notes,
      dueDate,
      lightningAddress: lnAddress,
    })
  }

  const symbol = FIAT_SYMBOLS[currency]
  const rateSource = rate?.source ?? null

  return (
    <div className="space-y-6">
      {editing ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          Editing <span className="font-mono font-semibold">{editing.number}</span> — totals are recalculated when you save.
        </div>
      ) : null}
      {/* Sender / client */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sender-name">Your name / business</Label>
          <Input
            id="sender-name"
            placeholder="Satoshi Designs Ltd"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-name">Client name</Label>
          <Input
            id="client-name"
            placeholder="ACME Corp"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sender-details">Your details (address, email, VAT…)</Label>
          <Textarea
            id="sender-details"
            placeholder={'12 Orange Street\nLondon\nhello@example.com'}
            rows={3}
            value={senderDetails}
            onChange={(e) => setSenderDetails(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-details">Client details</Label>
          <Textarea
            id="client-details"
            placeholder={'1 Client Road\nManchester\naccounts@client.com'}
            rows={3}
            value={clientDetails}
            onChange={(e) => setClientDetails(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Currency + rate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Invoicing currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as FiatCurrency)}
          >
            <SelectTrigger aria-label="Invoicing currency">
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="btc-rate">
              BTC rate (1 BTC in {symbol})
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Manual</span>
              <Switch
                checked={manualRateMode}
                onCheckedChange={setManualRateMode}
                aria-label="Toggle manual rate"
              />
            </div>
          </div>
          {manualRateMode ? (
            <Input
              id="btc-rate"
              inputMode="decimal"
              placeholder={`e.g. ${symbol}82,000`}
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Input
                id="btc-rate"
                value={
                  liveRate
                    ? `${symbol}${liveRate.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                    : ''
                }
                readOnly
                placeholder={rateLoading ? 'Loading live rate…' : 'Live rate unavailable'}
                aria-readonly
                className="bg-muted"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onRefreshRate}
                      aria-label="Refresh BTC rate"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${rateLoading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {rateSource ? `Live rate via ${rateSource}` : 'Refresh live rate'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {manualRateMode
              ? 'Manual rate — used for the sats conversion on this invoice.'
              : liveRate
                ? `Live rate via ${rateSource}, refreshed every 5 min.`
                : 'No live rate — flip to Manual and enter one.'}
          </p>
        </div>
      </div>

      <Separator />

      {/* Line items */}
      <div className="space-y-3">
        <Label>Line items</Label>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_72px_104px_32px] items-center gap-2 sm:grid-cols-[1fr_80px_120px_40px]"
            >
              <Input
                placeholder={idx === 0 ? 'Description (e.g. Landing page design)' : 'Description'}
                value={item.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                aria-label={`Item ${idx + 1} description`}
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Qty"
                value={item.quantity || ''}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                aria-label={`Item ${idx + 1} quantity`}
              />
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {symbol}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7"
                  placeholder="0.00"
                  value={item.unitPrice || ''}
                  onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                  aria-label={`Item ${idx + 1} unit price`}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
                aria-label={`Remove item ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1.5 h-4 w-4" /> Add line item
        </Button>
      </div>

      <Separator />

      {/* Extras */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="due-date">Due date</Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ln-address">Lightning Address on invoice</Label>
          <Input
            id="ln-address"
            placeholder="you@wallet.com"
            value={lnAddress}
            onChange={(e) => setLnAddress(e.target.value)}
          />
          {lnAddress && !isValidLightningAddress(lnAddress) ? (
            <p className="text-xs text-destructive">Format should be name@domain.com</p>
          ) : !lnAddress ? (
            <WalletReferral url={settings?.walletReferralUrl} lead="No Lightning Address yet?" />
          ) : null}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes / payment terms</Label>
          <Textarea
            id="notes"
            rows={2}
            placeholder="Thanks for your business — payment in sats via the Lightning QR on this invoice."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Totals + save */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total: {symbol}
            {totalFiat.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <Zap className="h-4 w-4 text-primary" fill="currentColor" aria-hidden="true" />
            <span className="font-mono text-2xl font-bold tabular-nums" aria-live="polite">
              {effectiveRate > 0 ? formatSats(totalSats) : '—'}
            </span>
            <span className="text-sm font-medium text-muted-foreground">sats</span>
          </p>
        </div>
        <div className="flex gap-2">
          {editing && onCancelEdit ? (
            <Button variant="outline" onClick={onCancelEdit} disabled={saving}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          ) : null}
          <Button onClick={handleSubmit} disabled={saving} className="sm:min-w-40">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : editing ? `Update ${editing.number}` : 'Save invoice'}
          </Button>
        </div>
      </div>
    </div>
  )
}
