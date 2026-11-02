'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from 'next-themes'
import { useToast } from '@/hooks/use-toast'
import { InvoiceForm, type InvoiceFormPayload } from '@/components/invoice-form'
import { InvoiceDocument, type InvoiceDocData } from '@/components/invoice-document'
import { InvoicesList } from '@/components/invoices-list'
import { UnlockCard } from '@/components/unlock-card'
import { SettingsDialog } from '@/components/settings-dialog'
import { SendEmailDialog } from '@/components/send-email-dialog'
import { Landing } from '@/components/landing'
import { PublicInvoiceView } from '@/components/public-invoice'
import { AuthCard, type AuthUser } from '@/components/auth-card'
import { BrandMark } from '@/components/brand-mark'
import { FooterLinks } from '@/components/footer-links'
import {
  FREE_INVOICE_LIMIT,
  UNLOCK_PRICE_SATS,
  type FiatCurrency,
  type InvoiceDTO,
  type LicenseDTO,
  type LicenseStatusResponse,
  type RateResponse,
  type SettingsDTO,
} from '@/lib/types'
import { formatSats } from '@/lib/format'
import { fetchJson, type FetchJsonError } from '@/lib/utils'
import { Bitcoin, CheckCircle2, Home as HomeIcon, LogOut, Moon, Sun, Zap } from 'lucide-react'

type PaywallError = { error: string; message?: string } & { status?: number }
type View = 'landing' | 'app' | 'public'

export default function Home() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const [rate, setRate] = useState<RateResponse | null>(null)
  const [rateLoading, setRateLoading] = useState(true)
  const [settings, setSettings] = useState<SettingsDTO | null>(null)
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([])
  const [license, setLicense] = useState<LicenseDTO | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab] = useState('create')
  const [saving, setSaving] = useState(false)
  const [printData, setPrintData] = useState<InvoiceDocData | null>(null)
  const [emailInvoice, setEmailInvoice] = useState<InvoiceDTO | null>(null)
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<View>('landing')
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editing, setEditing] = useState<InvoiceDTO | null>(null)
  const [formKey, setFormKey] = useState(0)

  const loadRate = useCallback(async () => {
    setRateLoading(true)
    try {
      setRate(await fetchJson<RateResponse>('/api/rate'))
    } catch {
      setRate(null)
    } finally {
      setRateLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await fetchJson<SettingsDTO>('/api/settings'))
    } catch {
      // keep defaults
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    try {
      setInvoices(await fetchJson<InvoiceDTO[]>('/api/invoices'))
    } catch {
      // ignore
    }
  }, [])

  const loadLicense = useCallback(async () => {
    try {
      const json = await fetchJson<LicenseStatusResponse>('/api/license')
      setUnlocked(json.unlocked)
      setLicense(json.license)
      return json.unlocked
    } catch (err) {
      if ((err as FetchJsonError).status === 401) setUser(null)
      return false
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      setMounted(true)
      // Deep links: /#app opens the invoice app, /?i=<token> opens a shared invoice.
      if (window.location.hash === '#app') setView('app')
      const token = new URLSearchParams(window.location.search).get('i')
      if (token) {
        setShareToken(token)
        setView('public')
      }
      // Who am I? (session cookie)
      try {
        const json = await fetchJson<{ user: AuthUser | null }>('/api/auth/me')
        setUser(json.user)
      } catch {
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }, 0)
    const t2 = setTimeout(() => {
      void loadRate()
      void loadSettings()
      void loadInvoices()
      void loadLicense()
    }, 0)
    const iv = setInterval(loadRate, 5 * 60 * 1000)
    // Keep the view in sync with the URL (back/forward buttons, typed #app).
    const syncFromUrl = () => {
      const tok = new URLSearchParams(window.location.search).get('i')
      if (tok) {
        setShareToken(tok)
        setView('public')
      } else {
        setView(window.location.hash === '#app' ? 'app' : 'landing')
      }
    }
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener('hashchange', syncFromUrl)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
      clearInterval(iv)
      window.removeEventListener('popstate', syncFromUrl)
      window.removeEventListener('hashchange', syncFromUrl)
    }
  }, [loadRate, loadSettings, loadInvoices, loadLicense])

  const handleAuthed = (u: AuthUser) => {
    setUser(u)
    setTab('create')
    // Load this account's data.
    void loadInvoices()
    void loadLicense()
    void loadSettings()
    const free = settings?.freeInvoices ?? FREE_INVOICE_LIMIT
    toast({
      title: `Welcome, ${u.email}`,
      description: u.role === 'operator'
        ? 'You are the operator of this site — open Settings (gear icon) to set up unlock payments.'
        : `${free} free invoice${free === 1 ? '' : 's'} included — no card needed.`,
    })
  }

  const signOut = async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
    setInvoices([])
    setEditing(null)
    setUnlocked(false)
    setLicense(null)
    setView('landing')
    try {
      window.history.pushState(null, '', window.location.pathname)
    } catch {
      // ignore
    }
    toast({ title: 'Signed out' })
  }

  const launchApp = (tab?: 'create' | 'invoices' | 'unlock') => {
    if (tab) setTab(tab)
    setView('app')
    // Refresh unlock state — the user may be returning from a hosted Zaprite
    // checkout whose webhook has confirmed payment while they were away.
    void loadLicense()
    try {
      window.history.pushState(null, '', '#app')
    } catch {
      // ignore history errors
    }
  }

  const goHome = () => {
    setView('landing')
    try {
      window.history.pushState(null, '', window.location.pathname)
    } catch {
      // ignore history errors
    }
  }

  // Print portal: render doc, then hand it to the browser's print dialog (Save as PDF).
  useEffect(() => {
    if (!printData) return
    const t = setTimeout(() => {
      window.print()
      setPrintData(null)
    }, 150)
    return () => clearTimeout(t)
  }, [printData])

  const startEdit = (inv: InvoiceDTO) => {
    setEditing(inv)
    setFormKey((k) => k + 1)
    setTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setFormKey((k) => k + 1)
    setTab('invoices')
  }

  const handleSave = async (payload: InvoiceFormPayload) => {
    setSaving(true)
    try {
      const json = await fetchJson<{ number: string }>(
        editing ? `/api/invoices/${editing.id}` : '/api/invoices',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      await loadInvoices()
      toast({
        title: editing ? `Invoice ${json.number} updated` : `Invoice ${json.number} saved`,
        description: 'Share, email or print it from the Invoices tab.',
      })
      setEditing(null)
      setFormKey((k) => k + 1)
      setTab('invoices')
    } catch (err) {
      const e = err as FetchJsonError
      if (e.status === 402) {
        const paywall = (e.data ?? {}) as PaywallError
        toast({
          title: 'Free plan limit reached',
          description: paywall.message ?? 'Unlock unlimited invoices to continue.',
          variant: 'destructive',
        })
        setTab('unlock')
        return
      }
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: 'draft' | 'sent' | 'paid') => {
    try {
      await fetchJson(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadInvoices()
      toast({ title: status === 'paid' ? 'Marked as paid ⚡' : 'Marked as sent' })
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleReprice = async (inv: InvoiceDTO) => {
    try {
      const updated = await fetchJson<InvoiceDTO>(`/api/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reprice: true }),
      })
      await loadInvoices()
      toast({
        title: `${updated.number} re-priced`,
        description: `Now ${formatSats(updated.totalSats)} sats (was ${formatSats(inv.totalSats)}) at today's rate.`,
      })
    } catch (err) {
      toast({
        title: 'Re-price failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/invoices/${id}`, { method: 'DELETE' })
      await loadInvoices()
      toast({ title: 'Invoice deleted' })
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const gbpRate = rate?.rates?.GBP
  // Instance-wide white-label + pricing (operator-configurable; falls back to
  // the built-in defaults until the settings fetch lands).
  const brandName = settings?.brandName?.trim() || 'SatInvoice'
  const brandLogo = settings?.brandLogo ?? null
  const freeLimit = settings?.freeInvoices ?? FREE_INVOICE_LIMIT
  const unlockSats = settings?.unlockSats ?? UNLOCK_PRICE_SATS
  const remaining = Math.max(0, freeLimit - invoices.length)
  const usedCount = Math.min(invoices.length, freeLimit)

  if (view === 'public' && shareToken) {
    return <PublicInvoiceView token={shareToken} />
  }

  // The app is account-gated: logged-out visitors get the sign-in card.
  if (view === 'app') {
    if (authLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-label="Loading" />
        </div>
      )
    }
    if (!user) {
      return <AuthCard onAuthed={handleAuthed} brandName={brandName} brandLogo={brandLogo} />
    }
  }

  if (view === 'landing') {
    return (
      <Landing
        rate={rate}
        rateLoading={rateLoading}
        theme={mounted ? theme : undefined}
        setTheme={setTheme}
        onLaunch={launchApp}
        settings={settings}
        unlocked={unlocked}
        signedIn={!!user}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to landing page"
              onClick={goHome}
            >
              <HomeIcon className="h-4 w-4" />
            </Button>
            <BrandMark name={brandName} logo={brandLogo} tagline="invoices on a bitcoin standard" />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs sm:flex">
              <Bitcoin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-muted-foreground">1 BTC =</span>
              <span className="font-mono font-semibold tabular-nums" aria-live="polite">
                {rateLoading
                  ? '…'
                  : gbpRate
                    ? `£${gbpRate.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                    : 'n/a'}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <SettingsDialog settings={settings} role={user?.role ?? 'user'} onSaved={setSettings} />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Sign out"
              title={`Signed in as ${user?.email ?? ''} — click to sign out`}
              onClick={signOut}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden max-w-28 truncate sm:inline">{user?.email}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:hidden">
        {/* Hero */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Professional invoices,{' '}
            <span className="text-primary">priced in bitcoin</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Bill clients in fiat, get paid in sats — with live BTC rates, a Lightning payment QR on
            every invoice, and one-click PDF export. The tool itself runs on a bitcoin standard:
            unlock unlimited invoicing for {formatSats(unlockSats)} sats.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={unlocked ? 'default' : 'secondary'} className="gap-1.5">
              {unlocked ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Unlimited — unlocked
                </>
              ) : (
                `Free plan: ${remaining} of ${freeLimit} invoices left`
              )}
            </Badge>
            {gbpRate ? (
              <Badge variant="outline" className="gap-1.5 font-mono">
                <Zap className="h-3 w-3" /> 1 BTC = £
                {gbpRate.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </Badge>
            ) : null}
            <Badge variant="outline">via {rate?.source ?? 'manual rate'}</Badge>
          </div>
        </section>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v)
            // Always show a fresh list/count when the user opens the Invoices tab.
            if (v === 'invoices') loadInvoices()
          }}
        >
          <TabsList className="mb-6 grid w-full grid-cols-3 sm:w-auto sm:inline-grid sm:grid-cols-[auto_auto_auto]">
            <TabsTrigger value="create" className="px-4">
              Create
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 px-4">
              Invoices
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {invoices.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unlock" className="px-4">
              Unlock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
              <Card>
                <CardContent className="p-6">
                  <InvoiceForm
                    key={formKey}
                    editing={editing}
                    onCancelEdit={cancelEdit}
                    rate={rate}
                    rateLoading={rateLoading}
                    onRefreshRate={loadRate}
                    settings={settings}
                    onSave={handleSave}
                    saving={saving}
                  />
                </CardContent>
              </Card>
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Live preview — updates as you type
                </p>
                <PreviewDoc settings={settings} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesList
              invoices={invoices}
              onPrint={setPrintData}
              onEmail={setEmailInvoice}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onEdit={startEdit}
              onReprice={handleReprice}
            />
          </TabsContent>

          <TabsContent value="unlock">
            <UnlockCard
              unlocked={unlocked}
              license={license}
              role={user?.role ?? 'user'}
              settings={settings}
              onUnlocked={async () => {
                await loadLicense()
                setTab('create')
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <p>
            {brandName} ⚡ — a micro-tool on a bitcoin standard.{' '}
            {unlocked ? 'Unlimited plan active.' : `${usedCount}/${freeLimit} free invoices used.`}
          </p>
          <FooterLinks />
          <p className="font-mono">
            {formatSats(unlockSats)} sats = your price, in your money.
          </p>
        </div>
      </footer>

      {/* Print portal: only this renders on paper/PDF */}
      <div id="invoice-print" className="hidden print:block">
        {printData ? (
          <InvoiceDocument data={printData} brandName={brandName} className="border-0 shadow-none" />
        ) : null}
      </div>

      {/* Email delivery dialog */}
      <SendEmailDialog
        invoice={emailInvoice}
        onClose={() => setEmailInvoice(null)}
        onSent={loadInvoices}
      />
    </div>
  )
}

/** Live preview document that mirrors the form's draft from localStorage. */
function PreviewDoc({ settings }: { settings: SettingsDTO | null }) {
  const [snap, setSnap] = useState<InvoiceDocData | null>(null)

  useEffect(() => {
    const build = (): InvoiceDocData | null => {
      try {
        const sender = JSON.parse(window.localStorage.getItem('satinvoice.sender') ?? '{}')
        const client = JSON.parse(window.localStorage.getItem('satinvoice.client') ?? '{}')
        const draft = JSON.parse(
          window.localStorage.getItem('satinvoice.draft') ?? 'null'
        ) as (InvoiceDocData & { currency?: FiatCurrency }) | null
        if (!draft) return null
        return {
          senderName: draft.senderName ?? sender.senderName ?? '',
          senderDetails: draft.senderDetails ?? sender.senderDetails ?? '',
          clientName: draft.clientName ?? client.clientName ?? '',
          clientDetails: draft.clientDetails ?? client.clientDetails ?? '',
          currency: (draft.currency ?? settings?.defaultCurrency ?? 'GBP') as FiatCurrency,
          fxRate: draft.fxRate ?? 0,
          items: draft.items ?? [],
          notes: draft.notes ?? null,
          dueDate: draft.dueDate ?? null,
          lightningAddress: draft.lightningAddress || null,
          totalFiat: draft.totalFiat ?? 0,
          totalSats: draft.totalSats ?? 0,
          vatRate: draft.vatRate ?? null,
        } satisfies InvoiceDocData
      } catch {
        return null
      }
    }
    const t0 = setTimeout(() => setSnap(build()), 0)
    const t = setInterval(() => setSnap(build()), 300)
    return () => {
      clearTimeout(t0)
      clearInterval(t)
    }
  }, [settings])

  if (!snap) return <InvoiceDocument data={emptyDoc(settings)} isPreview brandName={settings?.brandName ?? undefined} />
  const empty = !snap.senderName && !snap.clientName && snap.items.every((i) => !i.description)
  return <InvoiceDocument data={snap} isPreview brandName={settings?.brandName ?? undefined} className={empty ? 'opacity-70' : ''} />
}

function emptyDoc(settings: SettingsDTO | null): InvoiceDocData {
  return {
    senderName: '',
    clientName: '',
    currency: settings?.defaultCurrency ?? 'GBP',
    fxRate: 0,
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    totalFiat: 0,
    totalSats: 0,
    lightningAddress: null,
  }
}
