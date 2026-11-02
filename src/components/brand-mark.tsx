'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import type { Branding } from '@/lib/types'

/**
 * The instance's white-label mark: the operator's logo image if configured,
 * otherwise the built-in orange bolt tile. Falls back to the bolt if the
 * logo URL is broken — a bad image must never break the header.
 */
export function BrandMark({
  name,
  logo,
  tagline,
  size = 'md',
  taglineClass = '',
}: {
  name: string
  logo?: string | null
  tagline?: string
  size?: 'sm' | 'md' | 'lg'
  taglineClass?: string
}) {
  const [broken, setBroken] = useState(false)
  const box = size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  const showLogo = Boolean(logo) && !broken

  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary`}>
        {showLogo ? (
          // Operator-supplied logo, displayed on its own tile-less background.
          <img
            src={logo ?? ''}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <Zap
            className={size === 'lg' ? 'h-5 w-5 text-primary-foreground' : 'h-4 w-4 text-primary-foreground'}
            fill="currentColor"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold">{name}</p>
        {tagline ? (
          <p className={`hidden text-[11px] text-muted-foreground sm:block ${taglineClass}`}>{tagline}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Convenience: derive branding from the settings DTO with safe fallbacks. */
export function brandingOf(
  settings: Branding | null | undefined
): { name: string; logo: string | null } {
  return {
    name: settings?.brandName?.trim() || 'SatInvoice',
    logo: settings?.brandLogo?.trim() || null,
  }
}
