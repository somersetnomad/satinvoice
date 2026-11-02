import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, Zap } from 'lucide-react'
import { BlogShell } from '@/components/blog-shell'
import { formatPostDate, getAllPosts, getPost, siteUrl } from '@/lib/blog'
import { getPublicConfigSafe } from '@/lib/settings'
import { getOperatorInfo } from '@/lib/operator'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Not found' }
  const url = `${siteUrl()}/blog/${post.slug}`
  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author],
    },
    twitter: { card: 'summary', title: post.title, description: post.description },
  }
}

/** Escape a JSON-LD payload for safe embedding in a <script> tag. */
const ld = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c')

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const { brandName } = await getPublicConfigSafe()
  const op = getOperatorInfo()
  const url = `${siteUrl()}/blog/${post.slug}`
  const related = getAllPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3)

  const article = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    mainEntityOfPage: url,
    url,
    author: { '@type': 'Person', name: post.author, url: `${siteUrl()}/about` },
    publisher: { '@type': 'Organization', name: op.name, url: siteUrl() },
  }
  const faqLd =
    post.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null

  return (
    <BlogShell brandName={brandName}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(article) }} />
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqLd) }} /> : null}

      <a href="/blog" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All articles
      </a>
      <article>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          By <a href="/about" className="font-medium text-foreground hover:underline">{post.author}</a> ·{' '}
          {formatPostDate(post.date)}
          {post.updated && post.updated !== post.date ? ` · Updated ${formatPostDate(post.updated)}` : ''} ·{' '}
          {post.readingMinutes} min read
        </p>

        <div className="blog-prose mt-8" dangerouslySetInnerHTML={{ __html: post.html }} />

        {post.faq.length > 0 ? (
          <section className="blog-prose mt-10">
            <h2>Frequently asked questions</h2>
            {post.faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </section>
        ) : null}
      </article>

      <aside className="mt-12 rounded-xl border bg-muted/40 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Invoice in pounds, get paid in sats</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {brandName} turns your normal invoice into a sats amount at today&apos;s rate, adds a Lightning QR code
              and a PDF your client can download. Your first invoices are free.
            </p>
            <a href="/#app" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
              Create a free invoice →
            </a>
          </div>
        </div>
      </aside>

      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        Written by <a href="/about" className="font-medium text-foreground hover:underline">{post.author}</a>, founder of{' '}
        {op.name}, who builds bitcoin tools for freelancers from {op.location.split(',')[0]}.
      </p>

      {related.length > 0 ? (
        <nav aria-label="More articles" className="mt-10">
          <h2 className="text-lg font-semibold">More from the blog</h2>
          <ul className="mt-3 space-y-2">
            {related.map((r) => (
              <li key={r.slug}>
                <a href={`/blog/${r.slug}`} className="text-primary underline-offset-4 hover:underline">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </BlogShell>
  )
}
