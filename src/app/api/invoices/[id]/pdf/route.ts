import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { toInvoiceDTO } from '@/lib/invoices'
import { getBranding } from '@/lib/settings'
import { pdfFilename, renderInvoicePdf } from '@/lib/invoice-pdf'
import { creditFor } from '@/lib/credit'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/invoices/[id]/pdf — the owner's invoice as a PDF download (?inline=1 to view). */
async function GET__impl(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params

  const inv = await db.invoice.findFirst({ where: { id, ownerId: user.id } })
  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { brandName, walletReferralUrl } = await getBranding()
  const credit = await creditFor(inv.ownerId, req)
  const bytes = await renderInvoicePdf(toInvoiceDTO(inv), { brandName, walletReferralUrl, credit })
  const inline = new URL(req.url).searchParams.get('inline') === '1'
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${pdfFilename(inv.number)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export const GET = withApi(GET__impl)
