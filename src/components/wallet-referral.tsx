import { ExternalLink, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

/** "No Lightning wallet yet?" referral link (operator-configurable URL). */
export function WalletReferral({
  url,
  lead = 'No Lightning wallet yet?',
  className,
  icon = true,
}: {
  url: string | null | undefined
  lead?: string
  className?: string
  icon?: boolean
}) {
  if (!url) return null
  let isAlby = false
  try {
    isAlby = /(^|\.)getalby\.com$/i.test(new URL(url).hostname)
  } catch {
    return null
  }
  return (
    <p className={cn('flex flex-wrap items-center gap-1 text-xs text-muted-foreground', className)}>
      {icon ? <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span>{lead}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener sponsored"
        className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
      >
        {isAlby ? 'Get a free Alby wallet' : 'Get a free Lightning wallet'}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </p>
  )
}
