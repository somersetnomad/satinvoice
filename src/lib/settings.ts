import { db } from '@/lib/db'

/**
 * Instance-wide configuration, resolved fresh on every call.
 *
 * Resolution order (first non-empty wins):
 *   1. Environment override (UNLOCK_LIGHTNING_ADDRESS / ZAPRITE_PAY_LINK /
 *      UNLOCK_SATS / FREE_INVOICES / BRAND_NAME / BRAND_LOGO)
 *   2. The operator's settings row (the first registered user configures
 *      these in the Settings dialog)
 *   3. Built-in defaults
 */
export const DEFAULT_UNLOCK_SATS = 21000
export const DEFAULT_FREE_INVOICES = 3
export const DEFAULT_BRAND_NAME = 'SatInvoice'
/** Default "get a Lightning wallet" link (Alby referral) shown to people without a wallet. */
export const DEFAULT_WALLET_REFERRAL = 'https://getalby.com/invited-by/whiznurturing992525'

export type InstanceConfig = {
  lightningAddress: string | null
  zapriteLink: string | null
  unlockSats: number
  freeInvoices: number
  brandName: string
  brandLogo: string | null
  walletReferralUrl: string
}

function envInt(raw: string | undefined): number | null {
  if (!raw?.trim()) return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : null
}

function clampInt(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(hi, Math.max(lo, n))
}

export async function getInstanceConfig(): Promise<InstanceConfig> {
  const operator = await db.user.findFirst({ where: { role: 'operator' } })
  const s = operator ? await db.settings.findUnique({ where: { id: operator.id } }) : null

  return {
    lightningAddress: process.env.UNLOCK_LIGHTNING_ADDRESS?.trim() || s?.operatorLn || null,
    zapriteLink: process.env.ZAPRITE_PAY_LINK?.trim() || s?.operatorZaprite || null,
    unlockSats: clampInt(
      envInt(process.env.UNLOCK_SATS) ?? s?.unlockSats ?? DEFAULT_UNLOCK_SATS,
      1000,
      1_000_000_000,
      DEFAULT_UNLOCK_SATS
    ),
    freeInvoices: clampInt(
      envInt(process.env.FREE_INVOICES) ?? s?.freeInvoices ?? DEFAULT_FREE_INVOICES,
      0,
      1000,
      DEFAULT_FREE_INVOICES
    ),
    brandName:
      process.env.BRAND_NAME?.trim().slice(0, 40) || s?.brandName?.trim().slice(0, 40) || DEFAULT_BRAND_NAME,
    brandLogo: process.env.BRAND_LOGO?.trim() || s?.brandLogo?.trim() || null,
    walletReferralUrl:
      process.env.WALLET_REFERRAL_URL?.trim() || s?.walletReferral?.trim() || DEFAULT_WALLET_REFERRAL,
  }
}

/**
 * Branding only, safe to call from server components that must never throw
 * (root layout metadata). Falls back to defaults if the DB is unreachable.
 */
export async function getBranding(): Promise<{
  brandName: string
  brandLogo: string | null
  walletReferralUrl: string
}> {
  try {
    const cfg = await getInstanceConfig()
    return { brandName: cfg.brandName, brandLogo: cfg.brandLogo, walletReferralUrl: cfg.walletReferralUrl }
  } catch {
    return { brandName: DEFAULT_BRAND_NAME, brandLogo: null, walletReferralUrl: DEFAULT_WALLET_REFERRAL }
  }
}
