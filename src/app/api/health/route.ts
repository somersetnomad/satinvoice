import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApi, dbDiagnostic } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Strip anything credential-shaped from an error text before exposing it. */
function sanitize(text: string): string {
  return text
    .replace(/(postgres(ql)?|mysql|mongodb|file):\/\/[^\s'"<>]+/gi, '$1://***')
    .replace(/(password|secret|token)=[^\s'"&]+/gi, '$1=***')
}

/**
 * Public deployment self-check: open https://<your-app>/api/health in a
 * browser to see exactly which setup step is missing. Reports only
 * non-sensitive facts — never the connection string itself.
 */
async function GET__impl() {
  const raw = process.env.DATABASE_URL?.trim() ?? ''
  const protocol = raw ? raw.split(':')[0] : null

  if (!raw) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'DATABASE_URL is not set — add it in Vercel → Settings → Environment Variables, then redeploy (env changes only apply to new deployments).',
        database: {
          envConfigured: false,
          protocol: null,
          reachable: false,
          error:
            'DATABASE_URL is not set — add it in Vercel → Settings → Environment Variables, then redeploy (env changes only apply to new deployments).',
        },
      },
      { status: 503 }
    )
  }

  try {
    // A real model query — not `SELECT 1` — so a database whose tables were
    // never created (skipped `prisma db push`) is caught here too.
    await db.user.count()
    const warnings: string[] = []
    if (process.env.ZAPRITE_PAY_LINK && !process.env.ZAPRITE_WEBHOOK_SECRET)
      warnings.push('ZAPRITE_WEBHOOK_SECRET is not set — anyone can call the Zaprite webhook.')
    if (process.env.ALLOW_SELF_CONFIRM?.toLowerCase() === 'true')
      warnings.push('ALLOW_SELF_CONFIRM=true — users can unlock by clicking "I\'ve paid" without verification.')
    return NextResponse.json({
      ok: true,
      database: { envConfigured: true, protocol, reachable: true },
      email: { configured: Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM) },
      ...(warnings.length ? { warnings } : {}),
    })
  } catch (err) {
    const message = sanitize(dbDiagnostic(err))
    return NextResponse.json(
      {
        ok: false,
        error: message,
        database: {
          envConfigured: true,
          protocol,
          reachable: false,
          error: message,
        },
      },
      { status: 503 }
    )
  }
}

export const GET = withApi(GET__impl)
