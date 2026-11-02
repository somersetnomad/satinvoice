import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorized } from '@/lib/auth'
import { ensureShareToken, resolveOrigin } from '@/lib/share'
import { readJson, withApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/invoices/[id]/share
 * Ensures the invoice has a share token (idempotent) and returns the public URL.
 * Body (optional): { origin?: string } — the browser origin.
 */
async function POST__impl(req: Request, { params }: Ctx) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params

  const owned = await db.invoice.findFirst({ where: { id, ownerId: user.id }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const body = (await readJson<{ origin?: string }>(req)) ?? {}
  const { token, created } = await ensureShareToken(owned.id)
  const origin = resolveOrigin(req, body.origin)
  return NextResponse.json({ token, url: `${origin}/?i=${token}`, created })
}

/** DELETE /api/invoices/[id]/share — revoke the public link. */
async function DELETE__impl(req: Request, { params }: Ctx) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const { id } = await params

  const owned = await db.invoice.findFirst({ where: { id, ownerId: user.id }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  await db.invoice.update({ where: { id: owned.id }, data: { shareToken: null } })
  return NextResponse.json({ ok: true, revoked: true })
}

export const POST = withApi(POST__impl)
export const DELETE = withApi(DELETE__impl)
