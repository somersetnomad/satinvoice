import { getAllPosts, siteUrl } from '@/lib/blog'
import { getPublicConfigSafe } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/** GET /llms.txt — a plain summary of the site for AI assistants (llmstxt.org format). */
export async function GET() {
  const cfg = await getPublicConfigSafe()
  const b = cfg.brandName
  const base = siteUrl()
  const posts = getAllPosts()
  const body = `# ${b}

> ${b} is an invoicing tool for freelancers and small businesses who want to be paid in bitcoin. You write the invoice in pounds, euros or dollars; ${b} converts the total to sats at the live rate, prints the rate and date on the invoice, and adds a Lightning QR code and a downloadable PDF. Payments go straight to the freelancer's own Lightning address. The first ${cfg.freeInvoices} invoices are free; unlimited invoicing is a one-time ${new Intl.NumberFormat('en-GB').format(cfg.unlockSats)} sats.

## Key pages
- [Home](${base}/): what ${b} does and pricing
- [FAQ](${base}/faq): how pricing in pounds but paying in sats works, late payments, VAT, data
- [About](${base}/about): who runs ${b}
- [Privacy](${base}/privacy) and [Terms](${base}/terms)
- [Blog](${base}/blog): guides to getting paid in bitcoin
${posts.length ? `\n## Articles\n${posts.map((p) => `- [${p.title}](${base}/blog/${p.slug}): ${p.description}`).join('\n')}\n` : ''}`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
