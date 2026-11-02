import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, readCookie } from '@/lib/auth'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** POST /api/auth/logout — delete the session row + clear the cookie. */
async function POST__impl(req: Request) {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}


export const POST = withApi(POST__impl)