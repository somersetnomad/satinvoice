import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorized, type AuthedUser } from '@/lib/auth'
import { getInstanceConfig } from '@/lib/settings'
import { isValidLightningAddress } from '@/lib/format'
import { FIAT_CURRENCIES, type FiatCurrency, type SettingsDTO } from '@/lib/types'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

async function buildDTO(user: AuthedUser | null): Promise<SettingsDTO> {
  const cfg = await getInstanceConfig()
  let defaultCurrency: FiatCurrency = 'GBP'
  if (user) {
    const s = await db.settings.findUnique({ where: { id: user.id } })
    if (s && FIAT_CURRENCIES.includes(s.defaultCurrency as FiatCurrency)) {
      defaultCurrency = s.defaultCurrency as FiatCurrency
    }
  }
  const isOp = user?.role === 'operator'
  return {
    // Payment destinations are operator-only; everyone else just learns
    // which unlock methods exist (payments.*).
    lightningAddress: isOp ? cfg.lightningAddress : null,
    zapriteLink: isOp ? cfg.zapriteLink : null,
    defaultCurrency,
    unlockSats: cfg.unlockSats,
    freeInvoices: cfg.freeInvoices,
    brandName: cfg.brandName,
    brandLogo: cfg.brandLogo,
    walletReferralUrl: cfg.walletReferralUrl,
    payments: { lnurl: !!cfg.lightningAddress, zaprite: !!cfg.zapriteLink },
  }
}

/**
 * GET /api/settings — public. Instance pricing + branding, which unlock
 * methods are available, and (signed in) the caller's default currency.
 */
async function GET__impl(req: Request) {
  const user = await requireUser(req)
  return NextResponse.json(await buildDTO(user))
}

type SettingsBody = Partial<{
  defaultCurrency: unknown
  lightningAddress: unknown
  zapriteLink: unknown
  unlockSats: unknown
  freeInvoices: unknown
  brandName: unknown
  brandLogo: unknown
  walletReferralUrl: unknown
}>

const OPERATOR_KEYS = [
  'lightningAddress',
  'zapriteLink',
  'unlockSats',
  'freeInvoices',
  'brandName',
  'brandLogo',
  'walletReferralUrl',
] as const

const asText = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

/**
 * PUT /api/settings — partial update.
 * The instance settings (payment destination, pricing, branding) are
 * operator-only: anyone else sending them gets 403 and nothing is written.
 * A signed-in user may still save their own default currency on its own.
 */
async function PUT__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  const body = (await req.json()) as SettingsBody | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const touchesOperator = OPERATOR_KEYS.some((k) => body[k] !== undefined)
  if (touchesOperator && user.role !== 'operator') {
    return NextResponse.json(
      {
        error: 'forbidden',
        message: 'Only the site operator can change payment, pricing or branding settings.',
      },
      { status: 403 }
    )
  }

  const data: {
    defaultCurrency?: string
    operatorLn?: string | null
    operatorZaprite?: string | null
    unlockSats?: number | null
    freeInvoices?: number | null
    brandName?: string | null
    brandLogo?: string | null
    walletReferral?: string | null
  } = {}
  const bad = (message: string) => NextResponse.json({ error: message }, { status: 400 })

  if (body.defaultCurrency !== undefined) {
    const c = asText(body.defaultCurrency).toUpperCase()
    if (!FIAT_CURRENCIES.includes(c as FiatCurrency)) return bad('Currency must be GBP, USD or EUR')
    data.defaultCurrency = c
  }
  if (body.lightningAddress !== undefined) {
    const v = asText(body.lightningAddress) || null
    if (v && !isValidLightningAddress(v)) return bad('Invalid Lightning Address (expected name@domain.com)')
    data.operatorLn = v
  }
  if (body.zapriteLink !== undefined) {
    const v = asText(body.zapriteLink) || null
    if (v && !/^https?:\/\/\S+$/.test(v)) return bad('Zaprite link must start with https://')
    data.operatorZaprite = v
  }
  if (body.unlockSats !== undefined) {
    const raw = asText(body.unlockSats)
    if (!raw) data.unlockSats = null
    else {
      const n = Number(raw)
      if (!Number.isInteger(n) || n < 1000 || n > 1_000_000_000)
        return bad('Unlock price must be a whole number of at least 1,000 sats')
      data.unlockSats = n
    }
  }
  if (body.freeInvoices !== undefined) {
    const raw = asText(body.freeInvoices)
    if (!raw) data.freeInvoices = null
    else {
      const n = Number(raw)
      if (!Number.isInteger(n) || n < 0 || n > 1000)
        return bad('Free invoices must be a whole number between 0 and 1000')
      data.freeInvoices = n
    }
  }
  if (body.brandName !== undefined) {
    const v = asText(body.brandName)
    if (v.length > 40) return bad('Brand name can be at most 40 characters')
    data.brandName = v || null
  }
  if (body.brandLogo !== undefined) {
    const v = asText(body.brandLogo) || null
    if (v && (v.length > 2000 || !/^(https?:\/\/\S+|data:image\/)/.test(v)))
      return bad('Logo must be an https:// image URL')
    data.brandLogo = v
  }
  if (body.walletReferralUrl !== undefined) {
    const v = asText(body.walletReferralUrl) || null // empty = back to the default link
    if (v && (v.length > 500 || !/^https:\/\/\S+$/.test(v)))
      return bad('Wallet referral link must be an https:// URL')
    data.walletReferral = v
  }

  if (Object.keys(data).length > 0) {
    await db.settings.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data },
    })
  }

  return NextResponse.json(await buildDTO(user))
}

export const GET = withApi(GET__impl)
export const PUT = withApi(PUT__impl)
