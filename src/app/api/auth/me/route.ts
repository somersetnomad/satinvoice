import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** GET /api/auth/me — the signed-in user, or null. */
async function GET__impl(req: Request) {
  const user = await requireUser(req)
  return NextResponse.json({ user })
}


export const GET = withApi(GET__impl)