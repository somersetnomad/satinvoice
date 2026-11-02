import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, createSession, hashPassword, sessionCookieOptions } from '@/lib/auth'
import { withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

/**
 * POST /api/auth/register { email, password }
 * The FIRST account on a fresh deployment becomes the "operator" — they
 * configure where unlock payments land, pricing and branding. Everyone after
 * that is a regular user with their own private invoices and free tier.
 */
async function POST__impl(req: Request) {
  const body = (await req.json()) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: 'invalid_email', message: 'Enter a valid email address.' },
      { status: 400 }
    )
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'weak_password', message: 'Password needs at least 8 characters.' },
      { status: 400 }
    )
  }

  const passwordHash = hashPassword(password)
  let user
  try {
    user = await db.$transaction(async (tx) => {
      const userCount = await tx.user.count()
      const created = await tx.user.create({
        data: { email, passwordHash, role: userCount === 0 ? 'operator' : 'user' },
      })
      await tx.settings.create({ data: { id: created.id, defaultCurrency: 'GBP' } })
      return created
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        {
          error: 'email_already_registered',
          message: 'That email is already registered — sign in instead.',
        },
        { status: 400 }
      )
    }
    throw err
  }

  const { token, expiresAt } = await createSession(user.id)
  const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
  return res
}

export const POST = withApi(POST__impl)
