import type { ReactNode } from 'react'
import { Zap } from 'lucide-react'
import { FooterLinks } from '@/components/footer-links'

/** Header/footer frame for the blog (server-rendered, matches the info pages). */
export function BlogShell({ brandName, children }: { brandName: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              </span>
              {brandName}
            </a>
            <a href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              Blog
            </a>
          </div>
          <a href="/#app" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Open the app →
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t py-6 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4">
          <p>{brandName} — invoices on a bitcoin standard</p>
          <FooterLinks />
        </div>
      </footer>
    </div>
  )
}
