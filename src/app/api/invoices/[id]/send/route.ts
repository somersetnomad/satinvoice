import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { buildInvoiceEmail } from '@/lib/email-template'
import { ensureShareToken, resolveOrigin } from '@/lib/share'
import { toInvoiceDTO } from '@/lib/invoices'
import { getBranding } from '@/lib/settings'
import { readJson, withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_FIND = /[^\s@<>(),;]+@[^\s@<>(),;]+\.[a-z]{2,}/i

async function POST__impl(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params

  const body = (await readJson<{ to?: string; message?: string; origin?: string }>(req)) ?? {}

  const inv = await db.invoice.findFirst({ where: { id, ownerId: user.id } })
  if (!inv) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const host = process.env.SMTP_HOST
  const from = process.env.MAIL_FROM
  if (!host || !from) {
    return NextResponse.json(
      {
        error: 'smtp_not_configured',
        message:
          'Direct sending is not configured on this deployment. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM — or use the mailto fallback.',
      },
      { status: 503 }
    )
  }

  // Recipient: explicit `to`, else the first email address in the client details.
  const to = (body.to ?? '').trim() || (inv.clientDetails.match(EMAIL_FIND)?.[0] ?? '')
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 })
  }

  const dto = toInvoiceDTO(inv)

  // Public web page for this invoice — the email's big "View invoice" button.
  const { token } = await ensureShareToken(inv.id)
  const publicUrl = `${resolveOrigin(req, body.origin)}/?i=${token}`
  const { brandName } = await getBranding()
  const email = buildInvoiceEmail(dto, body.message, publicUrl, brandName)

  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })

    await transport.sendMail({
      from,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })

  } catch (err) {
    return NextResponse.json(
      {
        error: 'send_failed',
        message: err instanceof Error ? err.message : 'SMTP transport failed',
      },
      { status: 502 }
    )
  }

  await db.invoice.update({
    where: { id: inv.id },
    data: { status: inv.status === 'paid' ? 'paid' : 'sent', sentTo: to, sentAt: new Date() },
  })
  return NextResponse.json({ ok: true, to, subject: email.subject, publicUrl })
}


export const POST = withApi(POST__impl)