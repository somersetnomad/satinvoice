import type { Metadata } from 'next'
import { InfoPage, Section } from '@/components/info-page'
import { getPublicConfigSafe } from '@/lib/settings'
import { getOperatorInfo } from '@/lib/operator'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getPublicConfigSafe()
  return { title: `Privacy policy — ${brandName}`, description: `How ${brandName} handles your data.` }
}

export default async function PrivacyPage() {
  const { brandName: b } = await getPublicConfigSafe()
  const op = getOperatorInfo()
  return (
    <InfoPage brandName={b} title="Privacy policy" updated="2 November 2026" intro={`Plain English: we collect as little as possible, we don't sell it, and we never hold your money.`}>
      <Section title="Who is responsible for your data">
        <p>
          {b} is operated by {op.name} ({op.person}), {op.location}, the &quot;controller&quot; of your account data
          under UK data protection law (UK GDPR). Contact: <a href={`mailto:${op.contact}`}>{op.contact}</a>.
        </p>
        <p>
          The invoices you create contain details of <em>your</em> clients. For that information you are the controller
          and we process it on your behalf, only to provide the service.
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li><strong>Account:</strong> your email address and a one-way hash of your password (we can&apos;t see your password).</li>
          <li><strong>Invoices:</strong> what you enter: your and your client&apos;s names and details, line items, amounts, notes, due dates, Lightning address, and VAT rate.</li>
          <li><strong>Emails you send through {b}:</strong> the recipient address, and when it was sent.</li>
          <li><strong>Unlock payments:</strong> the amount, status and a Lightning payment request. Payments go over the Lightning network; we never receive card or bank details.</li>
          <li><strong>Settings:</strong> your default currency (and branding/payment settings for the site operator).</li>
        </ul>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          We use one strictly necessary cookie to keep you signed in (it expires after 30 days or when you sign out). We
          don&apos;t use analytics, advertising or tracking cookies. Your browser also stores your in-progress invoice
          draft locally on your own device so you don&apos;t lose your work; that never leaves your device unless you save
          the invoice.
        </p>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run your account and show, share, email and export your invoices.</li>
          <li>To process the one-time unlock payment and confirm it.</li>
          <li>To reply when you contact us.</li>
        </ul>
        <p>
          Our lawful basis is performing our contract with you (providing the service you signed up for) and our
          legitimate interest in keeping the service secure. We don&apos;t use your data for marketing and we never sell it.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>Only the providers needed to run the service:</p>
        <ul>
          <li><strong>Vercel</strong>: hosting (app servers in Dublin, Ireland).</li>
          <li><strong>Supabase</strong>: database (Ireland, EU).</li>
          <li><strong>Resend</strong>: delivers invoice emails you choose to send (EU sending region).</li>
          <li><strong>Lightning payment providers</strong>: to create the unlock payment request; no personal data is sent.</li>
          <li><strong>Bitcoin price services</strong> (blockchain.info, CoinGecko): to fetch live prices; no personal data is sent.</li>
        </ul>
        <p>
          Some of these companies are based in the US; where data leaves the UK it&apos;s protected by the safeguards UK law
          requires (such as the UK–US data bridge or standard contractual clauses).
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account and invoices for as long as your account exists. Email us to delete your account and
          we&apos;ll erase your data within 30 days, except anything we must keep by law.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask to access, correct, export or delete your data, or object to how we use it: email{' '}
          <a href={`mailto:${op.contact}`}>{op.contact}</a>. If you&apos;re unhappy with our answer, you can complain to the
          UK Information Commissioner&apos;s Office at <a href="https://ico.org.uk" target="_blank" rel="noopener">ico.org.uk</a>.
        </p>
      </Section>

      <Section title="Security">
        <p>
          All connections are encrypted (HTTPS), passwords are hashed, secrets are stored encrypted, and shared invoice
          links use long random tokens that can be revoked at any time.
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy we&apos;ll update the date above, and tell account holders by email if the change is significant.</p>
      </Section>
    </InfoPage>
  )
}
