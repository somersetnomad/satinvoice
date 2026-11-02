import { NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Whether outbound email is configured on this deployment (SMTP_* env vars). */
async function GET__impl(req: Request) {
  const user = await requireUser(req)
  if (!user) return unauthorized()

  const configured = Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM)
  return NextResponse.json({
    configured,
    from: process.env.MAIL_FROM ?? null,
    transport: process.env.SMTP_HOST ? 'smtp' : null,
  })
}


export const GET = withApi(GET__impl)