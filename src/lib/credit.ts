import { db } from '@/lib/db'
import { resolveOrigin } from '@/lib/share'

export type Credit = { url: string; host: string }

/**
 * Free-plan credit line ("Invoiced with <brand> — <host>") for an invoice owner.
 * Owners who have unlocked (paid) get clean, unbranded invoices — a perk of paying.
 */
export async function creditFor(ownerId: string, req: Request): Promise<Credit | null> {
  const paid = await db.license.findFirst({
    where: { ownerId, status: 'paid' },
    select: { id: true },
  })
  if (paid) return null
  const url = resolveOrigin(req)
  let host = url
  try {
    host = new URL(url).host
  } catch {
    // keep url as-is
  }
  return { url, host }
}
