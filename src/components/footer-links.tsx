import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

/** FAQ / About / Privacy / Terms links shown in every footer. */
export function FooterLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Site information" className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} className="underline-offset-2 hover:text-foreground hover:underline">
          {l.label}
        </a>
      ))}
    </nav>
  )
}
