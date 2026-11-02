import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'

/**
 * Markdown blog. Posts live in /content/blog/<slug>.md with front matter:
 *
 *   title, description, date (YYYY-MM-DD), updated?, author?, tags?, draft?,
 *   faq?: [{ q, a }]   — rendered as a FAQ section + FAQPage schema
 *
 * Drafts (draft: true) are never listed, served, or put in the sitemap.
 */

const DIR = path.join(process.cwd(), 'content', 'blog')

/** Local preview only: BLOG_SHOW_DRAFTS=1 lists drafts. Never set this in production. */
const showDrafts = () => process.env.BLOG_SHOW_DRAFTS === '1' && process.env.VERCEL !== '1'

export type FaqItem = { q: string; a: string }

export type PostMeta = {
  slug: string
  title: string
  description: string
  date: string
  updated: string | null
  author: string
  tags: string[]
  readingMinutes: number
  faq: FaqItem[]
}

export type Post = PostMeta & { html: string }

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function parse(file: string): (Post & { draft: boolean }) | null {
  const slug = file.replace(/\.md$/, '')
  if (!SLUG_RE.test(slug)) return null
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8')
  const { data, content } = matter(raw)
  if (!data.title || !data.date) return null
  const words = content.split(/\s+/).filter(Boolean).length
  const faq = Array.isArray(data.faq)
    ? (data.faq as Array<Record<string, unknown>>)
        .filter((f) => typeof f?.q === 'string' && typeof f?.a === 'string')
        .map((f) => ({ q: String(f.q), a: String(f.a) }))
    : []
  return {
    slug,
    title: String(data.title),
    description: String(data.description ?? ''),
    date: String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date),
    updated: data.updated
      ? String(data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : data.updated)
      : null,
    author: String(data.author ?? 'Bala Danmeri'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(words / 220)),
    faq,
    draft: data.draft === true,
    html: marked.parse(content, { async: false, gfm: true }) as string,
  }
}

function load(): Post[] {
  if (!fs.existsSync(DIR)) return []
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map(parse)
    .filter((p): p is Post & { draft: boolean } => !!p && (!p.draft || showDrafts()))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getAllPosts(): PostMeta[] {
  return load().map(({ html, ...meta }) => meta)
}

export function getPost(slug: string): Post | null {
  if (!SLUG_RE.test(slug)) return null
  return load().find((p) => p.slug === slug) ?? null
}

export function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Absolute site origin for canonical URLs, feeds and sitemaps. */
export function siteUrl(): string {
  return (process.env.APP_URL?.trim() || 'https://invoice.noorintelligence.tech').replace(/\/$/, '')
}
