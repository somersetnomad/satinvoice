import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  DUMMY_PASSWORD_HASH,
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** POST /api/auth/login { email, password } → session cookie. */
async function POST__impl(req: Request) {
  const body = (await req.json()) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const user = email ? await db.user.findUnique({ where: { email } }) : null
  // Always run scrypt, even for unknown emails, so response timing doesn't
  // reveal which addresses are registered.
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH) && !!user
  if (!user || !ok) {
    return NextResponse.json(
      { error: 'invalid_credentials', message: 'Wrong email or password.' },
      { status: 401 }
    )
  }

  const { token, expiresAt } = await createSession(user.id)
  const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
  return res
}

export const POST = withApi(POST__impl)
