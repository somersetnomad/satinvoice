# SatInvoice

Bitcoin invoices for freelancers: price your work in GBP, USD or EUR, get paid in sats. A multi-user, white-label micro-SaaS with a Lightning-native paywall.

- **Invoices**: fiat line items converted to satoshis at the live BTC rate (blockchain.info → CoinGecko failover, manual fallback). Create, edit, mark sent/paid, delete, print/PDF.
- **Sharing**: an unguessable public link (`/?i=<token>`) shows the client a branded invoice, and the email sender (SMTP, with a `mailto:` fallback) includes it.
- **Accounts**: email + password (scrypt, DB-backed httpOnly sessions). Every account is private. The **first account registered is the operator**.
- **Paywall**: each account gets a few free invoices (3 by default). After that, creating an invoice returns `402` and opens the Unlock panel: a one-time payment in sats via a Lightning invoice (auto-confirmed through LUD-21 verify) or Zaprite (webhook).
- **White-label**: the operator sets the unlock price, free-tier size, payout Lightning Address, brand name and logo in Settings. Environment variables can lock any of these.
- **Debuggable in production**: every API route returns JSON errors with specific database diagnostics, and `/api/health` names the missing setup step.

## Quick start (local, SQLite)

```bash
cp .env.example .env        # DATABASE_URL=file:../db/custom.db
mkdir -p db
npm install                 # runs prisma generate
npx prisma db push          # creates the tables
npm run dev                 # http://localhost:3000
```

Open the app, choose **Create account**, and you're the operator. Use **Settings** (gear icon) to set your Lightning Address, and **Unlock → Simulate payment** to try the paywall without a wallet.

Production build: `npm run build && npm start` (serves `.next/standalone/server.js`).

## Deploying

See **[DEPLOY.md](./DEPLOY.md)**. Vercel + Postgres is a one-file schema switch (`mv prisma/schema.postgres.prisma prisma/schema.prisma`); SQLite works on any host with a persistent disk.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build + standalone asset copy |
| `npm start` | Run the standalone production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sync the Prisma schema to `DATABASE_URL` |

## API overview

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me` | — | Accounts and sessions |
| `GET/POST /api/invoices`, `GET/PATCH/DELETE /api/invoices/[id]` | user | Own invoices (402 past the free tier) |
| `POST/DELETE /api/invoices/[id]/share` | user | Create / revoke the public link |
| `POST /api/invoices/[id]/send` | user | Email the invoice (503 `smtp_not_configured` without SMTP) |
| `GET /api/public/invoices/[token]` | public | Client-facing invoice + branding |
| `GET /api/rate` | public | Live BTC price in GBP/USD/EUR (5-min cache) |
| `GET/PUT /api/settings` | public / operator | Pricing, branding, payment config |
| `POST /api/checkout`, `GET/POST /api/license` | user | Unlock payment + status |
| `POST /api/webhooks/zaprite` | public (optional secret) | Zaprite payment confirmation |
| `GET /api/email/status`, `GET /api/health` | user / public | Email config, deployment self-check |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui · Prisma (SQLite locally, Postgres on Vercel) · nodemailer · qrcode.react
