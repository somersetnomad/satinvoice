import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

/**
 * Lazily create (or reuse) the unguessable share token for an invoice.
 * Tokens are only minted when an invoice is actually shared, so untouched
 * drafts never carry a public URL. Callers must check ownership first.
 */
export async function ensureShareToken(invoiceId: string): Promise<{ token: string; created: boolean }> {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, shareToken: true },
  })
  if (!inv) throw new Error('Invoice not found')
  if (inv.shareToken) return { token: inv.shareToken, created: false }

  const token = randomBytes(16).toString('hex') // 32 hex chars
  await db.invoice.update({ where: { id: invoiceId }, data: { shareToken: token } })
  return { token, created: true }
}

/**
 * Public origin for links: APP_URL (if set) wins, then the browser-supplied
 * origin, then the request's Origin header, then the request URL.
 */
export function resolveOrigin(req: Request, clientOrigin?: string): string {
  const configured = process.env.APP_URL?.trim()
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/$/, '')
  if (clientOrigin && /^https?:\/\/[^\s/]+$/.test(clientOrigin.replace(/\/$/, '')))
    return clientOrigin.replace(/\/$/, '')
  const headerOrigin = req.headers.get('origin')
  if (headerOrigin && /^https?:\/\//.test(headerOrigin)) return headerOrigin.replace(/\/$/, '')
  return new URL(req.url).origin
}
