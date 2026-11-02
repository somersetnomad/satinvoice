// Post-build fixup for self-hosted `output: "standalone"` deployments.
//
// `next build` emits .next/standalone/server.js but leaves the static assets
// behind; they must be copied in for `node .next/standalone/server.js` to
// serve CSS/JS correctly. On Vercel this is handled automatically, so the
// script simply no-ops when the standalone folder is absent.
//
// Cross-platform on purpose (works on Windows/macOS/Linux) and never fails
// the build — a hosting platform that doesn't need it must not break on it.
import { cpSync, existsSync } from 'fs'

const standalone = '.next/standalone'
if (existsSync(standalone)) {
  cpSync('.next/static', `${standalone}/.next/static`, { recursive: true })
  cpSync('public', `${standalone}/public`, { recursive: true })
  console.log('✓ standalone fixup: static + public copied into .next/standalone')
} else {
  console.log('✓ standalone fixup: no .next/standalone (managed platform) — skipped')
}
