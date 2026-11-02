import type { ReactNode } from 'react'
import { ArrowLeft, Zap } from 'lucide-react'
import { FooterLinks } from '@/components/footer-links'

/** Shared layout for the FAQ, About, Privacy and Terms pages (server-rendered). */
export function InfoPage({
  brandName,
  title,
  intro,
  updated,
  children,
}: {
  brandName: string
  title: string
  intro?: ReactNode
  updated?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            </span>
            {brandName}
          </a>
          <a href="/#app" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Open the app →
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <a href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to {brandName}
        </a>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {intro ? <p className="mt-3 text-lg text-muted-foreground">{intro}</p> : null}
        {updated ? <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p> : null}
        <div className="info-prose mt-8 space-y-8 leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <footer className="border-t py-6 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4">
          <p>{brandName} — invoices on a bitcoin standard</p>
          <FooterLinks />
        </div>
      </footer>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
