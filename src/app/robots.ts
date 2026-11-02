import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/blog'

export const dynamic = 'force-dynamic'

/** All crawlers (search and AI assistants) welcome on public pages; API routes excluded. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
