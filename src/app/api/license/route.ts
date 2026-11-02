import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { allowSelfConfirm, checkLnurlVerify, settlePendingLnurl, verifyUrlOf } from '@/lib/payments'
import type { License } from '@prisma/client'
import type { LicenseDTO, LicenseStatusResponse } from '@/lib/types'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

function toDTO(l: License): LicenseDTO {
  return {
    key: l.key,
    provider: l.provider as LicenseDTO['provider'],
    sats: l.sats,
    status: l.status as LicenseDTO['status'],
    paymentRequest: l.paymentRequest,
    reference: verifyUrlOf(l.reference) ? null : l.reference, // never expose verify URLs
    paidAt: l.paidAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  }
}

/**
 * GET /api/license — { unlocked, license } for the caller.
 * Each poll also checks the caller's pending LNURL invoices (LUD-21 verify),
 * so a Lightning payment unlocks the account automatically.
 */
async function GET__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  const findPaid = () =>
    db.license.findFirst({ where: { ownerId: user.id, status: 'paid' }, orderBy: { createdAt: 'desc' } })

  let paid = await findPaid()
  if (!paid && (await settlePendingLnurl(user.id))) paid = await findPaid()

  const res: LicenseStatusResponse = {
    unlocked: !!paid,
    license: paid ? toDTO(paid) : null,
    selfConfirm: allowSelfConfirm(),
  }
  return NextResponse.json(res)
}

/**
 * POST /api/license { licenseKey } — self-serve confirmation of the caller's
 * OWN pending license (manual fallback; the webhook / LUD-21 verify are the
 * automatic paths).
 *   - LNURL with a verify URL: confirmed only if the wallet reports it settled.
 *   - Otherwise: trusted only when ALLOW_SELF_CONFIRM=true (off by default,
 *     because a buyer could otherwise unlock without paying).
 */
async function POST__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  const body = (await req.json()) as { licenseKey?: unknown } | null
  const licenseKey = typeof body?.licenseKey === 'string' ? body.licenseKey.trim() : ''
  if (!licenseKey) return NextResponse.json({ error: 'licenseKey is required' }, { status: 400 })

  const license = await db.license.findUnique({ where: { key: licenseKey } })
  if (!license || license.ownerId !== user.id) {
    return NextResponse.json({ error: 'License not found' }, { status: 404 })
  }
  if (license.status === 'paid') return NextResponse.json({ ok: true, status: 'paid' })

  const verifyUrl = license.provider === 'lnurl' ? verifyUrlOf(license.reference) : null
  if (verifyUrl) {
    const settled = await checkLnurlVerify(verifyUrl)
    if (settled !== true && !allowSelfConfirm()) {
      return NextResponse.json(
        {
          error: 'payment_not_detected',
          message:
            settled === false
              ? "Payment not detected yet — Lightning payments usually land within seconds. Try again in a moment."
              : "Couldn't reach the wallet to check the payment — try again in a moment.",
        },
        { status: 409 }
      )
    }
  } else if (!allowSelfConfirm()) {
    return NextResponse.json(
      {
        error: 'confirmation_pending',
        message:
          license.provider === 'zaprite'
            ? 'Waiting for Zaprite to confirm your payment — this page unlocks automatically once it does.'
            : "This payment can't be verified automatically. Contact the site operator with your license key.",
      },
      { status: 409 }
    )
  }

  const updated = await db.license.update({
    where: { key: license.key },
    data: { status: 'paid', paidAt: new Date() },
  })
  return NextResponse.json({ ok: true, status: updated.status })
}

export const GET = withApi(GET__impl)
export const POST = withApi(POST__impl)
