import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'si_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/* ── Passwords: scrypt (node built-in, no native deps) ──────────────────── */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(hash)) return false
  const candidate = scryptSync(password, salt, 64)
  const original = Buffer.from(hash, 'hex')
  return original.length === candidate.length && timingSafeEqual(original, candidate)
}

/** A valid-format hash nobody knows the password to — used to equalise login timing. */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(16).toString('hex'))

/* ── Sessions: opaque token in an httpOnly cookie, row in the DB ────────── */

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  }
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie')
  if (!raw) return null
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(idx + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

export type AuthedUser = { id: string; email: string; role: 'operator' | 'user' }

/** Resolve the signed-in user from the request cookie (or null). */
export async function requireUser(req: Request): Promise<AuthedUser | null> {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return null
  const session = await db.session.findUnique({ where: { token } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { token } }).catch(() => {})
    return null
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    await db.session.delete({ where: { token } }).catch(() => {})
    return null
  }
  return { id: user.id, email: user.email, role: user.role as AuthedUser['role'] }
}

export const unauthorized = () =>
  Response.json({ error: 'auth_required', message: 'Sign in to continue.' }, { status: 401 })

/** The operator (first registered account) configures payments, pricing and branding. */
export const isOperator = (user: AuthedUser | null) => user?.role === 'operator'
