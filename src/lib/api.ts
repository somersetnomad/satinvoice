import { NextResponse } from 'next/server'

/**
 * Server-side helpers shared by every API route.
 *
 * Why this exists: in production, Next.js route handlers that throw an
 * unhandled exception return a 500 with an EMPTY body. Clients that call
 * res.json() then crash with the cryptic "Unexpected end of JSON input".
 * Every handler in this app is wrapped with `withApi`, which guarantees a
 * JSON error body — with a human-friendly, specific hint for the common
 * failure modes (missing DATABASE_URL, wrong schema, missing tables…).
 */

/** True when the error is a JSON.parse failure (empty or malformed body). */
function isJsonSyntaxError(err: unknown): boolean {
  return err instanceof SyntaxError && /JSON/i.test(err.message)
}

/**
 * Diagnostic table: the FIRST matching pattern decides the message shown on
 * the sign-in screen and by GET /api/health. Order matters — specific causes
 * must come before the generic Prisma fallback.
 */
const DB_DIAGNOSTICS: Array<[RegExp, string]> = [
  [
    /Environment variable not found: DATABASE_URL|P1012/i,
    'DATABASE_URL is not set — add it in Vercel → Settings → Environment Variables, then redeploy (env changes only apply to new deployments).',
  ],
  [
    /must start with the protocol `file:`/i,
    'DATABASE_URL is a Postgres URL but you deployed the SQLite schema — switch the schema first: `mv prisma/schema.postgres.prisma prisma/schema.prisma`, then redeploy (DEPLOY.md, step 2).',
  ],
  [
    /must start with the protocol `postgres/i,
    'DATABASE_URL is a SQLite file URL but this build uses the Postgres schema — on Vercel you need a Postgres connection string (DEPLOY.md, step 1).',
  ],
  [
    /P2021|P2022|does not exist in the current database|no such table|no such column/i,
    'Database reachable, but its tables are missing — run `npx prisma db push` once against your DATABASE_URL (DEPLOY.md, step 3).',
  ],
  [
    /password authentication failed|P1010|authentication failed/i,
    'Database rejected the credentials — check the user/password inside DATABASE_URL.',
  ],
  [
    /Can't reach database server|P1001|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo/i,
    "Can't reach the database server — check the host/port in DATABASE_URL and that the database exists and is running (a paused Neon/Vercel Postgres instance wakes on first request; retry once).",
  ],
  [
    /Unable to open the database file|Error code 14|P1003|Cannot open database|SQLITE_CANTOPEN/i,
    "The database file can't be opened — check the path in DATABASE_URL. (On Vercel, SQLite file URLs don't work — use Postgres.)",
  ],
  [
    /DATABASE_URL/i,
    'DATABASE_URL is missing or invalid — set it to your Postgres connection string in Vercel → Settings → Environment Variables, then redeploy.',
  ],
  // Any other Prisma failure still deserves the DB hint, not a blank 500.
  [
    /PrismaClient|P\d{4}/i,
    'Database unreachable — verify DATABASE_URL (and that the database server is running).',
  ],
]

/** The specific diagnostic for a DB-related error, or null if not a DB error. */
function dbSpecificDiagnostic(err: unknown): string | null {
  const name = err instanceof Error ? `${err.name} ` : ''
  const msg = err instanceof Error ? err.message : String(err)
  const hay = `${name}${msg}`
  for (const [pattern, message] of DB_DIAGNOSTICS) {
    if (pattern.test(hay)) return message
  }
  return null
}

/**
 * Turn a raw Prisma/DB error into an actionable message. Shared by the
 * withApi wrapper and the /api/health diagnostic endpoint so the exact same
 * wording shows wherever the failure surfaces.
 */
export function dbDiagnostic(err: unknown): string {
  return (
    dbSpecificDiagnostic(err) ??
    'Database unreachable — verify DATABASE_URL (and that the database server is running).'
  )
}

function errorPayload(err: unknown): { status: number; error: string } {
  if (isJsonSyntaxError(err)) {
    return { status: 400, error: 'Invalid JSON in request body' }
  }
  const diagnostic = dbSpecificDiagnostic(err)
  if (diagnostic) {
    return { status: 503, error: diagnostic }
  }
  console.error('[api] unhandled error:', err)
  return { status: 500, error: 'Internal server error' }
}

/**
 * Wrap a route handler so unhandled exceptions become JSON responses instead
 * of Next's empty-body 500. Works for static and dynamic (params) handlers.
 *
 *   export const GET = withApi(async function GET(req: Request) { … })
 */
export function withApi<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args)
    } catch (err) {
      const { status, error } = errorPayload(err)
      return NextResponse.json({ error }, { status })
    }
  }
}

/**
 * Safely parse a JSON request body. Returns null when the body is empty or
 * malformed instead of throwing "Unexpected end of JSON input".
 */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text()
    if (!text.trim()) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
