import { db } from '@/lib/db'

/**
 * Lightning payment helpers (LNURL-pay / Lightning Address, LUD-06/16/21).
 *
 * LUD-21 "verify": many Lightning Address providers (Alby, Strike, Wallet of
 * Satoshi, LNbits, Blink…) return a `verify` URL alongside the bolt11. Polling
 * it tells us whether the invoice was actually settled, so LNURL unlocks
 * confirm automatically and can't be faked by the payer.
 */

type LnurlPayMetadata = {
  tag?: string
  callback?: string
  minSendable?: number
  maxSendable?: number
  status?: string
  reason?: string
}

type LnurlInvoice = { status?: string; reason?: string; pr?: string; verify?: string }

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`${new URL(url).host} returned HTTP ${res.status}`)
  try {
    return (await res.json()) as T
  } catch {
    throw new Error(`${new URL(url).host} did not return JSON`)
  }
}

export async function requestLnurlInvoice(
  address: string,
  sats: number
): Promise<{ paymentRequest: string; verifyUrl: string | null }> {
  const [name, domain] = address.trim().split('@')
  let meta: LnurlPayMetadata
  try {
    meta = await getJson<LnurlPayMetadata>(
      `https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`
    )
  } catch (err) {
    throw new Error(
      `Could not reach the Lightning Address ${address}: ${err instanceof Error ? err.message : 'request failed'}`
    )
  }
  if (meta.status === 'ERROR') throw new Error(meta.reason ?? 'Lightning Address returned an error')
  if (!meta.callback) throw new Error('Lightning Address did not return a callback URL')

  const amountMsat = sats * 1000
  if (meta.minSendable && amountMsat < meta.minSendable)
    throw new Error(`Amount below this wallet's minimum (${Math.ceil(meta.minSendable / 1000)} sats)`)
  if (meta.maxSendable && amountMsat > meta.maxSendable)
    throw new Error(`Amount above this wallet's maximum (${Math.floor(meta.maxSendable / 1000)} sats)`)

  const cb = new URL(meta.callback)
  cb.searchParams.set('amount', String(amountMsat))
  const inv = await getJson<LnurlInvoice>(cb.toString())
  if (inv.status === 'ERROR') throw new Error(inv.reason ?? 'Wallet refused to create an invoice')
  if (!inv.pr) throw new Error('Wallet did not return a payment request')
  const verifyUrl = inv.verify && /^https:\/\//.test(inv.verify) ? inv.verify : null
  return { paymentRequest: inv.pr, verifyUrl }
}

/** LUD-21: true when the wallet reports the invoice settled; null if it can't tell. */
export async function checkLnurlVerify(verifyUrl: string): Promise<boolean | null> {
  try {
    const r = await getJson<{ status?: string; settled?: boolean }>(verifyUrl)
    if (r.status === 'ERROR') return null
    return r.settled === true
  } catch {
    return null
  }
}

/** For LNURL licenses we store the LUD-21 verify URL in `reference` when the wallet offers one. */
export const verifyUrlOf = (reference: string | null): string | null =>
  reference && /^https:\/\//.test(reference) ? reference : null

/**
 * Check the caller's recent pending LNURL licenses against their verify URL
 * and mark any settled one paid. Returns true if the user is now unlocked.
 */
export async function settlePendingLnurl(ownerId: string): Promise<boolean> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const pending = await db.license.findMany({
    where: { ownerId, provider: 'lnurl', status: 'pending', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })
  for (const lic of pending) {
    const url = verifyUrlOf(lic.reference)
    if (!url) continue
    if ((await checkLnurlVerify(url)) === true) {
      await db.license.update({ where: { id: lic.id }, data: { status: 'paid', paidAt: new Date() } })
      return true
    }
  }
  return false
}

/** Whether unverifiable self-confirmation is allowed (trust mode). Off by default. */
export const allowSelfConfirm = () => process.env.ALLOW_SELF_CONFIRM?.trim().toLowerCase() === 'true'
