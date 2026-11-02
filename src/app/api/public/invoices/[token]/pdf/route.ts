import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toInvoiceDTO } from '@/lib/invoices'
import { getBranding } from '@/lib/settings'
import { pdfFilename, renderInvoicePdf } from '@/lib/invoice-pdf'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/public/invoices/[token]/pdf — client-facing PDF via the share token. */
async function GET__impl(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const inv = await db.invoice.findUnique({ where: { shareToken: token } })
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { brandName } = await getBranding()
  const bytes = await renderInvoicePdf(toInvoiceDTO(inv), { brandName, clientView: true })
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
