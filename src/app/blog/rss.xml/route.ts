import { getAllPosts, siteUrl } from '@/lib/blog'
import { getPublicConfigSafe } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const x = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** GET /blog/rss.xml — RSS 2.0 feed of published posts. */
export async function GET() {
  const { brandName } = await getPublicConfigSafe()
  const base = siteUrl()
  const items = getAllPosts()
    .map(
      (p) => `    <item>
      <title>${x(p.title)}</title>
      <link>${base}/blog/${p.slug}</link>
      <guid isPermaLink="true">${base}/blog/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T09:00:00Z`).toUTCString()}</pubDate>
      <description>${x(p.description)}</description>
    </item>`
    )
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${x(brandName)} blog</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Guides for freelancers who invoice in pounds and get paid in bitcoin.</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
