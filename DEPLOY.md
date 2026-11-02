# Deploying SatInvoice

A sats-native invoicing micro-tool. Next.js 16 + Prisma. Multi-user: every visitor creates a free account (email + password), gets free invoices (3 by default) and their own private workspace — and **the first account registered becomes the operator**, who configures where unlock payments land.

1. **Vercel has an ephemeral filesystem.** SQLite files are wiped between serverless invocations, so on Vercel you must use Postgres (free tiers: Neon, Vercel Postgres, Supabase). The repo ships both Prisma schemas — switching is a one-file rename.
2. **Any host with a persistent disk** (Railway, Render, Fly.io, a VPS) can run the SQLite schema as-is.

## Accounts & the operator

- Anyone can sign up free — their invoices, settings and unlock state are private to their account.
- The **first registered user = operator**. In Settings they set the Lightning Address / Zaprite link that receive all unlock payments, plus the reseller pricing and white-label brand.
- The sandbox "Simulate payment" unlock is visible to the operator only (it's a test fixture, not a real payment).
- Optional env overrides (beat the operator's Settings values):

| Variable | Purpose |
| --- | --- |
| `UNLOCK_LIGHTNING_ADDRESS` | forces the LNURL unlock destination |
| `ZAPRITE_PAY_LINK` | forces the Zaprite checkout link |
| `UNLOCK_SATS` / `FREE_INVOICES` | forces the reseller pricing (see *Make it yours* below) |
| `BRAND_NAME` / `BRAND_LOGO` | forces the white-label branding |
| `ZAPRITE_WEBHOOK_SECRET` | recommended with Zaprite — the webhook then only accepts calls carrying `?secret=<value>` |
| `ALLOW_SELF_CONFIRM` | `true` lets users unlock by clicking *I've paid* without any verification (off by default — see *How unlock payments are confirmed*) |
| `APP_URL` | optional public origin (e.g. `https://invoices.example.com`) used in share/email links |

---

## Option A — Vercel + Postgres (recommended)

### 1. Create a free Postgres database
- [Neon](https://neon.tech) or Vercel Storage → Postgres. Copy the connection string (looks like `postgresql://user:pass@host/db?sslmode=require`).

### 2. Switch to the Postgres schema (one line)
```bash
mv prisma/schema.postgres.prisma prisma/schema.prisma
```

### 3. Create the tables (once, from your machine)
```bash
cp .env.example .env            # then paste your DATABASE_URL into it
npm install
npx prisma db push
```

### 4. Deploy
Either way works:
- **GitHub:** push the **contents** of this folder to a repo (so `package.json` sits at the repo root — *not* inside a `satinvoice/` subfolder). If it does end up in a subfolder, set Vercel → Settings → General → **Root Directory** to that folder, then redeploy.
- **CLI:** `npx vercel` from inside this folder (the one containing `package.json`) and follow the prompts.

> ⚠️ Push the repo with Git or the CLI — don't upload the zip file itself to GitHub, and never commit `db/` or `.env` (the `.gitignore` ships correct).

### 5. Environment variables (Vercel → Settings → Environment Variables)
| Variable | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | your Postgres connection string |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | optional | enables one-click email delivery (Resend, Gmail app password, Postmark…). Without them the email dialog falls back to *Open in email app*. |

`postinstall` already runs `prisma generate`, so the build needs no extra config. Add any of the optional variables from the table at the top too (e.g. `ZAPRITE_WEBHOOK_SECRET`). **Redeploy after every env change** — env vars only apply to new deployments.

---

## Option B — SQLite (Railway / Render / Fly / VPS)

Keep `prisma/schema.prisma` as-is. Point `DATABASE_URL` at a path on a **persistent volume**, e.g. `DATABASE_URL=file:/data/custom.db`, then:

```bash
npm install
npx prisma db push          # once — creates the tables
npm run build               # builds + copies static assets into .next/standalone
NODE_ENV=production PORT=3000 node .next/standalone/server.js
```

> The standalone server reads env vars from the process environment — export `DATABASE_URL` (and the optional ones) in your service config.

> On a VPS any Node process manager works. On Railway/Render mount a volume at the folder you point SQLite at.

## Make it yours (reseller knobs)

Everything a reseller needs to rebrand the instance and set their own terms lives in **Settings** (gear icon, operator account) — no redeploy needed:

| Setting | What it does |
| --- | --- |
| Unlock price (sats) | The one-time price every non-operator account pays to go unlimited (default 21,000) |
| Free invoices | How many invoices each new account gets free (default 3) |
| Brand name | Replaces "SatInvoice" across the app, tab title, client invoice pages and the printed footer |
| Logo URL | Your logo image in the header (broken URLs safely fall back to the bolt) |

Optional env overrides (take precedence over Settings, so your terms can't be changed from the UI): `UNLOCK_SATS`, `FREE_INVOICES`, `BRAND_NAME`, `BRAND_LOGO`, `UNLOCK_LIGHTNING_ADDRESS`, `ZAPRITE_PAY_LINK`.

---

## After your first deploy (checklist)

1. Open `https://<your-domain>/api/health` → it must say `{"ok":true,…}`. Any `warnings` listed there are worth fixing.
2. **Sign up first** — the first account becomes the operator. Open **Settings** (gear icon) → set your **Lightning Address** (where unlock payments land) and, optionally, your **Zaprite payment link**, unlock price, free-invoice count, brand name and logo.
3. Zaprite users: set `ZAPRITE_WEBHOOK_SECRET` in your env, then in the Zaprite dashboard add the webhook `https://<your-domain>/api/webhooks/zaprite?secret=<the same value>`.
4. Test end to end with a second account (private window): create invoices up to the free limit → the Unlock panel opens → pay the Lightning invoice → it unlocks by itself. Then share an invoice link (`/?i=…`) and send one by email.

## How unlock payments are confirmed

| Method | How it confirms | Trust |
| --- | --- | --- |
| **Lightning (LNURL)** | The app asks your wallet for a BOLT11 invoice. If the wallet supports **LUD-21 verify** (Alby, Strike, LNbits, Blink, Wallet of Satoshi and most modern Lightning Address providers), the Unlock panel polls the wallet and unlocks automatically once the invoice is **settled**. | Verified — can't be faked |
| **Zaprite** | Zaprite calls `/api/webhooks/zaprite` when the order is paid; the panel polls and unlocks. | Verified if `ZAPRITE_WEBHOOK_SECRET` is set; without it anyone who knows the endpoint can post a fake "paid" event |
| **I've paid** button | Re-checks the wallet (LUD-21). For wallets without verify support, or Zaprite, it only unlocks if `ALLOW_SELF_CONFIRM=true`. | Unverified when the flag is on — only enable it if you're happy to trust buyers |
| **Simulate payment** | Operator-only sandbox that unlocks the operator's own account. | Test fixture |

> Zaprite note: a static Zaprite payment link can't carry this app's license key. The webhook matches on `licenseKey` (in the payload or `metaData`) or the order reference; if your Zaprite setup can't pass either, rely on Lightning for automatic unlocks.

## What runs where

| Piece | Where |
| --- | --- |
| Landing page + app | `/` (hash-routed: `/#app`) |
| Public client invoice page | `/?i=<shareToken>` |
| Zaprite webhook | `POST /api/webhooks/zaprite` |
| LNURL / Zaprite / demo checkout | `POST /api/checkout` |
| Email send | `POST /api/invoices/[id]/send` |

---

## Troubleshooting

### Deployment shows `404 NOT_FOUND` (with an error ID like `lhr1::…`)

This is Vercel's "nothing was deployed at this URL" page. SatInvoice always serves `/` once the build succeeds — so the 404 means **the build failed or Vercel never found the app**. Check, in order:

1. **Read the build logs** — Vercel dashboard → your project → *Deployments* → click the failed deployment → *Build Logs*. The real error is there. Look for the first red ✗, not the last line.
2. **Root Directory** — the most common cause. If your repo has the app inside a subfolder (e.g. you pushed the zip as `satinvoice/…`), set Settings → General → **Root Directory** → `satinvoice`, save, and redeploy. `package.json` must sit at the *root Vercel builds from*.
3. **Node version** — Next.js 16 needs Node ≥ 20.9. This repo pins `"engines": { "node": ">=20.9.0" }`, which Vercel honours; older projects created pre-2025 may need Node bumped in Settings → Build & Development Settings.
4. **Env vars** — the *build* runs fine with none set, but the **runtime** needs `DATABASE_URL` (a Postgres connection string, per step 1–2). Missing it gives 500s on API calls, not a 404 — so if you see a 404, it's steps 1–3.
5. **CLI deploys** — run `vercel` from the folder containing `package.json`. Running it one level up deploys the wrong thing.
6. A deployment that shows *Ready* but 404s everywhere is rare — that's the signature of `output` misconfig; this repo ships a working config, so re-check you're deploying **this** code (the zip's `DEPLOY.md` travels with the code — make sure you're on the latest zip).

### Env changes "don't work"

Vercel only applies environment variables to **new** deployments. After adding or changing any variable: Deployments → ⋯ → **Redeploy**.

### Runtime errors after switching databases

You deployed with the SQLite schema (default `prisma/schema.prisma`) but a Postgres `DATABASE_URL`, or the reverse. Switch the schema file as in step 2 and redeploy. `/api/health` names the exact mismatch.

### Upgrading an existing deployment to this version

This version adds database indexes. Run `npx prisma db push` once against your `DATABASE_URL` after deploying (it's non-destructive).

### Browser shows "Unexpected end of JSON input" (fixed)

Older builds crashed like this whenever an API call returned a non-JSON or empty body — typically an empty-body 500 from a missing/misconfigured `DATABASE_URL`, or an HTML error page from a proxy. Two layers now prevent it:

- **Server**: every API route is wrapped so unhandled errors return readable JSON instead of an empty 500.
- **Client**: all fetches parse defensively and surface the server's own error message (e.g. in the toast) instead of crashing on JSON.parse.

### First diagnostic: open `/api/health`

Visit `https://<your-app>.vercel.app/api/health` in a browser. It checks the database and reports **exactly** which setup step is missing (never the connection string itself). The same wording appears on the sign-in screen when a request fails:

| Message | Cause | Fix |
| --- | --- | --- |
| `DATABASE_URL is not set — …` | The env var is absent (or you added it but didn't redeploy) | Vercel → Settings → Environment Variables → add it → **Redeploy** |
| `DATABASE_URL is a Postgres URL but you deployed the SQLite schema — …` | DEPLOY.md step 2 was skipped | `mv prisma/schema.postgres.prisma prisma/schema.prisma`, commit, redeploy |
| `DATABASE_URL is a SQLite file URL but this build uses the Postgres schema — …` | A `file:` URL on Vercel | Use a Postgres connection string (step 1) |
| `Can't reach the database server — …` | Wrong host/port, DB deleted, or the database was never created | Check the connection string; on Neon/Vercel Postgres a paused DB wakes on the first request — retry once |
| `Database rejected the credentials — …` | Wrong user/password in the URL | Fix user/password in DATABASE_URL |
| `Database reachable, but its tables are missing — …` | DEPLOY.md step 3 was skipped | Run `npx prisma db push` once from your machine, then retry |
| `The database file can't be opened — …` | SQLite path doesn't exist | Create the folder (e.g. `mkdir -p db`); on Vercel you need Postgres, not SQLite |
| `Database unreachable — …` | Any other database failure | Check the Vercel function logs for the underlying error |

When `/api/health` returns `{"ok":true,…}`, sign-in will work. If you still see the raw `Unexpected end of JSON input`, you are running an older build — redeploy the latest zip. Vercel → *Deployments* → *Functions* logs show the failing request in either case.

### Emails not sending

Check `SMTP_HOST` and `MAIL_FROM` (both required) plus `SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` in Vercel → Settings → Environment Variables, then redeploy. Use `SMTP_SECURE=true` for port 465, `false` for 587. `/api/health` reports `email.configured`. Without SMTP the app still works — the email dialog falls back to *Open in email app* (mailto). A send failure shows the SMTP server's own error in the toast.
