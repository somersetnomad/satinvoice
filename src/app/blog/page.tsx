import type { Metadata } from 'next'
import { BlogShell } from '@/components/blog-shell'
import { formatPostDate, getAllPosts, siteUrl } from '@/lib/blog'
import { getPublicConfigSafe } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getPublicConfigSafe()
  const title = `Blog — getting paid in bitcoin as a freelancer | ${brandName}`
  const description =
    'Practical guides for freelancers and small businesses who invoice in pounds and get paid in sats over Lightning.'
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/blog`, types: { 'application/rss+xml': `${siteUrl()}/blog/rss.xml` } },
    openGraph: { title, description, url: `${siteUrl()}/blog`, type: 'website', siteName: brandName },
  }
}

export default async function BlogIndex() {
  const { brandName } = await getPublicConfigSafe()
  const posts = getAllPosts()
  return (
    <BlogShell brandName={brandName}>
      <h1 className="text-3xl font-bold tracking-tight">The {brandName} blog</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Plain-English guides to invoicing in pounds and getting paid in bitcoin: pricing, Lightning, late payments and
        keeping your books straight.
      </p>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium text-foreground">First articles coming soon.</p>
          <p className="mt-1 text-sm">
            Meanwhile, the <a href="/faq" className="text-primary underline-offset-4 hover:underline">FAQ</a> answers the
            most common questions.
          </p>
        </div>
      ) : (
        <ul className="mt-10 divide-y">
          {posts.map((p) => (
            <li key={p.slug} className="py-6 first:pt-0">
              <a href={`/blog/${p.slug}`} className="group block">
                <h2 className="text-xl font-semibold tracking-tight group-hover:text-primary">{p.title}</h2>
                <p className="mt-2 text-muted-foreground">{p.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatPostDate(p.date)} · {p.readingMinutes} min read
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 text-xs text-muted-foreground">
        <a href="/blog/rss.xml" className="underline-offset-2 hover:underline">
          RSS feed
        </a>
      </p>
    </BlogShell>
  )
}
