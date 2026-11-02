import { FIAT_SYMBOLS, type FiatCurrency } from './types'

/** Format satoshis with thin thousand separators, e.g. 1234567 -> "1,234,567" */
export function formatSats(sats: number): string {
  return new Intl.NumberFormat('en-GB').format(Math.round(sats))
}

/** Format a fiat amount, e.g. 1234.5 GBP -> "£1,234.50" */
export function formatFiat(amount: number, currency: FiatCurrency): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatFiatPlain(amount: number, currency: FiatCurrency): string {
  return `${FIAT_SYMBOLS[currency] ?? ''}${new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

/** Convert a fiat amount to satoshis given a BTC price in that fiat currency */
export function fiatToSats(fiatAmount: number, btcPriceInFiat: number): number {
  if (!btcPriceInFiat || btcPriceInFiat <= 0) return 0
  return Math.round((fiatAmount / btcPriceInFiat) * 1e8)
}

/** Convert satoshis back to a fiat amount */
export function satsToFiat(sats: number, btcPriceInFiat: number): number {
  return (sats / 1e8) * btcPriceInFiat
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Lightning Address syntax check: user@domain */
export function isValidLightningAddress(address: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address.trim())
}
