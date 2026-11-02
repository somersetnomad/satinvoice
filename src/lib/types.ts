export type LineItem = {
  description: string
  quantity: number
  unitPrice: number
}

export type FiatCurrency = 'GBP' | 'USD' | 'EUR'

export const FIAT_CURRENCIES: FiatCurrency[] = ['GBP', 'USD', 'EUR']

export const FIAT_SYMBOLS: Record<FiatCurrency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
}

export type RateResponse = {
  rates: Partial<Record<FiatCurrency, number>>
  source: string
  fetchedAt: string
}

export type InvoiceDTO = {
  id: string
  number: string
  senderName: string
  senderDetails: string
  clientName: string
  clientDetails: string
  currency: FiatCurrency
  fxRate: number
  items: LineItem[]
  notes: string | null
  dueDate: string | null
  lightningAddress: string | null
  status: 'draft' | 'sent' | 'paid'
  totalFiat: number
  totalSats: number
  shareToken?: string | null
  sentTo?: string | null
  sentAt?: string | null
  createdAt: string
}

export type SettingsDTO = {
  lightningAddress: string | null
  zapriteLink: string | null
  defaultCurrency: FiatCurrency
  /** One-time unlock price in sats (operator-configurable) */
  unlockSats: number
  /** Free invoices per account (operator-configurable) */
  freeInvoices: number
  /** White-label instance name (operator-configurable) */
  brandName: string
  /** White-label logo image URL (operator-configurable) */
  brandLogo: string | null
  /** Which unlock payment methods the operator has configured (visible to everyone) */
  payments: { lnurl: boolean; zaprite: boolean }
}

/** Public, non-sensitive branding fields (shown on the client-facing pages) */
export type Branding = {
  brandName: string
  brandLogo: string | null
}

/** Response of GET /api/public/invoices/[token] */
export type PublicInvoiceResponse = InvoiceDTO & Branding

export type LicenseStatusResponse = {
  unlocked: boolean
  license: LicenseDTO | null
  /** Whether "I've paid" self-confirmation is trusted without verification */
  selfConfirm: boolean
}

export type LicenseDTO = {
  key: string
  provider: 'demo' | 'lnurl' | 'zaprite'
  sats: number
  status: 'pending' | 'paid'
  paymentRequest: string | null
  reference: string | null
  paidAt: string | null
  createdAt: string
}

export type CheckoutResponse = {
  licenseKey: string
  status: 'pending' | 'paid'
  provider: 'demo' | 'lnurl' | 'zaprite'
  paymentRequest?: string
  payLink?: string
  webhookUrl?: string
  /** LNURL: true when the wallet supports LUD-21 verify, so payment confirms automatically */
  autoConfirm?: boolean
}

/** Response of POST /api/invoices/[id]/share */
export type ShareResponse = {
  token: string
  url: string
  created: boolean
}

/** Free tier: default invoices per account before the paywall (operator can change) */
export const FREE_INVOICE_LIMIT = 3
/** Default one-time unlock price in satoshis (operator can change) */
export const UNLOCK_PRICE_SATS = 21000
