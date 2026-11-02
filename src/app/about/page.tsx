import type { Metadata } from 'next'
import { InfoPage, Section } from '@/components/info-page'
import { getPublicConfigSafe } from '@/lib/settings'
import { getOperatorInfo } from '@/lib/operator'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getPublicConfigSafe()
  return { title: `About — ${brandName}`, description: `Who runs ${brandName} and why.` }
}

export default async function AboutPage() {
  const { brandName: b } = await getPublicConfigSafe()
  const op = getOperatorInfo()
  return (
    <InfoPage brandName={b} title={`About ${b}`} intro="A small, independent tool for people who want to get paid in bitcoin without the hassle.">
      <Section title="Who we are">
        <p>
          {b} is built and run by {op.name} ({op.person}), an independent maker based in {op.location}. It&apos;s a
          deliberately small product: no investors, no ads, no selling of your data.
        </p>
      </Section>
      <Section title="Why it exists">
        <p>
          Getting paid in bitcoin should be as easy as sending a normal invoice. Most tools either take a cut of every
          payment, hold your money for you, or need you to run your own server. {b} does none of that: you invoice in
          the currency your client understands, and they pay your own Lightning wallet directly, straight to you.
        </p>
      </Section>
      <Section title="How we make money">
        <p>
          A one-time unlock fee once you go past the free invoices. We never take a percentage of what your clients pay
          you, and we never hold your funds.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          Questions, feedback or problems: <a href={`mailto:${op.contact}`}>{op.contact}</a>. We read everything.
        </p>
      </Section>
    </InfoPage>
  )
}
