import type { MetadataRoute } from 'next'
import { getAllPosts, siteUrl } from '@/lib/blog'

export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const pages: MetadataRoute.Sitemap = ['', '/blog', '/faq', '/about', '/privacy', '/terms'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === '' || p === '/blog' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : p === '/blog' ? 0.8 : 0.5,
  }))
  const posts = getAllPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updated ?? p.date,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
  return [...pages, ...posts]
}
