'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InvoiceDocument } from '@/components/invoice-document'
import { BrandMark, brandingOf } from '@/components/brand-mark'
import {
  FREE_INVOICE_LIMIT,
  UNLOCK_PRICE_SATS,
  type FiatCurrency,
  type RateResponse,
  type SettingsDTO,
} from '@/lib/types'
import { formatSats } from '@/lib/format'
import { fetchJson } from '@/lib/utils'
import {
  Bitcoin,
  CheckCircle2,
  Copy,
  FileDown,
  FileText,
  Home,
  Loader2,
  Moon,
  QrCode,
  RefreshCw,
  Sun,
  Wallet,
  Zap,
} from 'lucide-react'
import type { ThemeProviderProps } from 'next-themes'
import { WalletReferral } from '@/components/wallet-referral'
import { FooterLinks } from '@/components/footer-links'

const SAMPLE_DOC = {
  number: 'INV-2026-0042',
  senderName: 'Satoshi Designs Ltd',
  senderDetails: '12 Orange Street\nLondon\nhello@satoshi-designs.co.uk',
  clientName: 'ACME Corp',
  clientDetails: '1 Client Road\nManchester\naccounts@acme.com',
  currency: 'GBP' as FiatCurrency,
  fxRate: 58028.14,
  items: [
    { description: 'Landing page design + build', quantity: 1, unitPrice: 450 },
    { description: 'Monthly maintenance retainer', quantity: 2, unitPrice: 120 },
  ],
  notes: null,
  dueDate: null,
  lightningAddress: 'satoshi@getalby.com',
  totalFiat: 690,
  totalSats: 1189078,
  status: 'sent',
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

const features = (unlockSats: number) => [
  {
    icon: RefreshCw,
    title: 'Live BTC rates',
    body: 'Invoices priced in GBP, USD or EUR with the sats total calculated from the live bitcoin rate at the moment you issue.',
  },
  {
    icon: QrCode,
    title: 'Lightning QR on every invoice',
    body: 'Your Lightning Address and a scannable QR are printed right on the invoice — clients pay in sats in one scan.',
  },
  {
    icon: FileDown,
    title: 'One-click PDF export',
    body: 'Clean, professional documents via the browser print dialog. Send them, archive them, or attach them anywhere.',
  },
  {
    icon: CheckCircle2,
    title: 'Status tracking',
    body: 'Move invoices through draft → sent → paid and keep your sats receivables tidy.',
  },
  {
    icon: Wallet,
    title: 'Your money, your wallet',
    body: 'No payment processor holds your funds. Payments go peer-to-peer from your client\u2019s wallet to yours.',
  },
  {
    icon: Zap,
    title: 'Bitcoin-native pricing',
    body: `The tool itself runs on a standard it believes in: one-time payment of ${formatSats(unlockSats)} sats. No subscription.`,
  },
]

const steps = (brand: string) => [
  {
    icon: FileText,
    title: 'Create the invoice',
    body: `Add your line items in fiat. ${brand} locks in the BTC rate and shows the exact sats total.`,
  },
  {
    icon: QrCode,
    title: 'Client pays in sats',
    body: 'Email it or hand it over — your client scans the Lightning QR and settles instantly, fee-free.',
  },
  {
    icon: CheckCircle2,
    title: 'Mark it paid',
    body: 'Sats land directly in your wallet. Update the status and keep stacking.',
  },
]

export function Landing({
  rate,
  rateLoading,
  theme,
  setTheme,
  onLaunch,
  settings,
  unlocked,
  signedIn,
}: {
  rate: RateResponse | null
  rateLoading: boolean
  theme: string | undefined
  setTheme: (t: string) => void
  onLaunch: (tab?: 'create' | 'invoices' | 'unlock') => void
  settings: SettingsDTO | null
  unlocked: boolean
  signedIn: boolean
}) {
  const gbpRate = rate?.rates?.GBP
  // White-label + pricing from the operator's instance settings.
  const brand = brandingOf(settings)
  const unlockSats = settings?.unlockSats ?? UNLOCK_PRICE_SATS
  const freeInvoices = settings?.freeInvoices ?? FREE_INVOICE_LIMIT
  const FEATURES = features(unlockSats)
  const STEPS = steps(brand.name)

  const [zapState, setZapState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [zapLicenseKey, setZapLicenseKey] = useState('')
  const [zapError, setZapError] = useState('')

  const startZapriteCheckout = async () => {
    // Checkout needs an account — send visitors to sign in / sign up first.
    if (!signedIn) {
      onLaunch('unlock')
      return
    }
    setZapState('busy')
    setZapError('')
    try {
      const json = await fetchJson<{ licenseKey?: string; payLink?: string; status?: string }>('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'zaprite' }),
      })
      if (json.status === 'paid') {
        onLaunch('create')
        return
      }
      if (!json.payLink || !json.licenseKey) {
        throw new Error('Checkout failed')
      }
      setZapLicenseKey(json.licenseKey)
      setZapState('done')
      window.open(json.payLink, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setZapError(err instanceof Error ? err.message : 'Checkout failed — try again in the app.')
      setZapState('error')
    }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark
              name={brand.name}
              logo={brand.logo}
              tagline="invoices on a bitcoin standard"
            />
          </div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Landing sections">
            <Button variant="ghost" size="sm" onClick={() => scrollTo('features')}>
              Features
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo('how')}>
              How it works
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo('pricing')}>
              Pricing
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="/blog">Blog</a>
            </Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button onClick={() => onLaunch('create')}>
              <Zap className="mr-2 h-4 w-4" fill="currentColor" /> Launch app
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(60% 50% at 70% 20%, oklch(0.72 0.175 65 / 12%), transparent 70%)',
            }}
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
            <motion.div {...fadeUp}>
              <Badge variant="outline" className="mb-4 gap-1.5 font-mono">
                <Bitcoin className="h-3 w-3 text-primary" aria-hidden="true" />
                {rateLoading
                  ? 'Loading live rate…'
                  : gbpRate
                    ? `1 BTC = £${gbpRate.toLocaleString('en-GB', { maximumFractionDigits: 0 })} — live`
                    : 'live BTC rates'}
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Professional invoices,{' '}
                <span className="text-primary">priced in bitcoin</span>
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Bill your clients in normal money, get paid in sats. Live rates, a Lightning
                payment QR on every invoice, PDF export — and the sats land straight in your
                wallet. No processor, no subscription, no middleman.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={() => onLaunch('create')}>
                  <Zap className="mr-2 h-4 w-4" fill="currentColor" /> Start invoicing — free
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo('pricing')}>
                  See pricing
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Create a free account — {freeInvoices} invoices free, no card. Unlock unlimited for{' '}
                {formatSats(unlockSats)} sats, once.
              </p>
              <WalletReferral
                url={settings?.walletReferralUrl}
                lead="New to Lightning? Get paid in sats in minutes."
                className="mt-2"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 1.5 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="relative"
            >
              <div
                className="absolute -inset-4 rounded-2xl opacity-70 blur-2xl"
                style={{
                  background:
                    'radial-gradient(50% 50% at 50% 50%, oklch(0.72 0.175 65 / 25%), transparent 75%)',
                }}
                aria-hidden="true"
              />
              <InvoiceDocument data={SAMPLE_DOC} brandName={settings?.brandName || undefined} className="relative" />
            </motion.div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-3">
            {[
              [`${formatSats(unlockSats)} sats`, 'one-time unlock — yours forever, no subscription'],
              ['0% platform fees', 'payments flow peer-to-peer over Lightning'],
              [`${freeInvoices} free invoices`, 'every account — try the whole thing, no card'],
            ].map(([big, small]) => (
              <div key={big} className="text-center">
                <p className="font-mono text-2xl font-bold text-primary">{big}</p>
                <p className="mt-1 text-sm text-muted-foreground">{small}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything a sats-native freelancer needs</h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Built for people who want their invoicing to match their savings — bitcoin from the
              first line item to the final settlement.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <f.icon className="h-5 w-5 text-orange-600" aria-hidden="true" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <motion.div {...fadeUp} className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-2 text-muted-foreground">From line item to sats in your wallet — three steps.</p>
            </motion.div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                  className="relative rounded-xl border bg-card p-6"
                >
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 font-mono text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="mb-3 mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <s.icon className="h-5 w-5 text-orange-600" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Priced in sats, obviously</h2>
            <p className="mt-2 text-muted-foreground">No monthly fees. No card. Pay over Lightning.</p>
          </motion.div>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            <motion.div {...fadeUp} className="rounded-xl border bg-card p-6">
              <p className="text-sm font-semibold text-muted-foreground">FREE</p>
              <p className="mt-2 text-3xl font-bold">
                0 <span className="text-base font-medium text-muted-foreground">sats</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  `${freeInvoices} invoices`,
                  'Live BTC rates',
                  'Lightning QR on invoices',
                  'PDF export',
                ].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> {t}
                    </li>
                  )
                )}
              </ul>
              <Button variant="outline" className="mt-6 w-full" onClick={() => onLaunch('create')}>
                Start free
              </Button>
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.08 }}
              className="relative rounded-xl border-2 border-primary bg-card p-6 shadow-lg"
            >
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                {unlocked ? 'Active' : 'Most popular'}
              </Badge>
              <p className="text-sm font-semibold text-primary">UNLIMITED</p>
              <p className="mt-2 text-3xl font-bold">
                {formatSats(unlockSats)}{' '}
                <span className="text-base font-medium text-muted-foreground">sats — one-time</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  'Unlimited invoices, forever',
                  'All free-plan features',
                  'Email delivery + public invoice page',
                  'Zaprite / LNURL checkout included',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>

              {unlocked ? (
                <Button className="mt-6 w-full" onClick={() => onLaunch('create')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Unlimited active — open app
                </Button>
              ) : !signedIn ? (
                <Button className="mt-6 w-full" onClick={() => onLaunch('unlock')}>
                  <Zap className="mr-2 h-4 w-4" fill="currentColor" /> Unlock for {formatSats(unlockSats)} sats
                </Button>
              ) : zapState === 'done' ? (
                <div className="mt-6 rounded-lg border bg-secondary/50 p-3 text-left">
                  <p className="text-xs font-semibold">
                    ⚡ Checkout opened in a new tab — {formatSats(unlockSats)} sats
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The app unlocks automatically once payment is confirmed. Keep your license
                    key just in case:
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
                      {zapLicenseKey}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 shrink-0"
                      aria-label="Copy license key"
                      onClick={() => navigator.clipboard?.writeText(zapLicenseKey).catch(() => {})}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => onLaunch('unlock')}
                  >
                    Finish in the app →
                  </Button>
                </div>
              ) : settings?.payments?.zaprite ? (
                <>
                  <Button
                    className="mt-6 w-full"
                    disabled={zapState === 'busy'}
                    onClick={startZapriteCheckout}
                  >
                    {zapState === 'busy' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" fill="currentColor" />
                    )}
                    Unlock via Zaprite
                  </Button>
                  {zapState === 'error' ? (
                    <p className="mt-2 text-xs text-destructive">{zapError}</p>
                  ) : (
                    <button
                      className="mt-2 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => onLaunch('unlock')}
                    >
                      or see all payment options in the app
                    </button>
                  )}
                </>
              ) : (
                <Button className="mt-6 w-full" onClick={() => onLaunch('unlock')}>
                  <Zap className="mr-2 h-4 w-4" fill="currentColor" /> Unlock for {formatSats(unlockSats)} sats
                </Button>
              )}
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <motion.div
            {...fadeUp}
            className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground"
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Stop invoicing in fiat. Start stacking sats.
            </h2>
            <p className="mx-auto mt-2 max-w-xl opacity-90">
              Your first {freeInvoices} invoices are free. It takes about two minutes to send the first one.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-6"
              onClick={() => onLaunch('create')}
            >
              <Zap className="mr-2 h-4 w-4" fill="currentColor" /> Open {brand.name}
            </Button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Home className="h-3 w-3" aria-hidden="true" />
            {brand.name} — invoices on a bitcoin standard
          </p>
          <FooterLinks />
          <button
            className="underline-offset-2 hover:underline"
            onClick={() => onLaunch('create')}
          >
            Launch app →
          </button>
        </div>
      </footer>
    </div>
  )
}

// next-themes type re-export keeps the prop contract explicit without extra deps.
export type { ThemeProviderProps }
