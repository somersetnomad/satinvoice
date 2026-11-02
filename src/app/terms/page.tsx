import type { Metadata } from 'next'
import { InfoPage, Section } from '@/components/info-page'
import { getPublicConfigSafe } from '@/lib/settings'
import { getOperatorInfo } from '@/lib/operator'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getPublicConfigSafe()
  return { title: `Terms of service — ${brandName}`, description: `The terms for using ${brandName}.` }
}

const sats = (n: number) => new Intl.NumberFormat('en-GB').format(n)

export default async function TermsPage() {
  const cfg = await getPublicConfigSafe()
  const b = cfg.brandName
  const op = getOperatorInfo()
  return (
    <InfoPage brandName={b} title="Terms of service" updated="2 November 2026" intro={`The rules for using ${b}, in plain English.`}>
      <Section title="1. Who we are">
        <p>
          {b} is provided by {op.name} ({op.person}), {op.location} (&quot;we&quot;, &quot;us&quot;). Contact:{' '}
          <a href={`mailto:${op.contact}`}>{op.contact}</a>. By creating an account you agree to these terms.
        </p>
      </Section>

      <Section title="2. The service">
        <p>
          {b} lets you create, share, email and export invoices priced in a fiat currency and payable in bitcoin over the
          Lightning network. Payments from your clients go directly to the Lightning address you provide; we never hold,
          receive or control your funds and we are not a bank, payment provider or money transmitter.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You must be 18 or over. Keep your password safe; you&apos;re responsible for activity on your account. Tell us
          straight away if you think someone else has access.
        </p>
      </Section>

      <Section title="4. Prices and the unlock payment">
        <p>
          Each account includes {cfg.freeInvoices} free invoices. Unlimited invoices cost a one-time payment of{' '}
          {sats(cfg.unlockSats)} sats, paid over Lightning. Your account is unlocked as soon as the payment is confirmed.
        </p>
        <p>
          Because the unlock is digital content supplied immediately at your request, you agree that it starts straight
          away and acknowledge that you lose your 14-day right to cancel once it has been supplied. This doesn&apos;t affect
          your other statutory rights: if the service is faulty or not as described, contact us and we&apos;ll put it right.
          Lightning payments can&apos;t be reversed, so please check the amount before you pay.
        </p>
      </Section>

      <Section title="5. Your invoices and your responsibilities">
        <ul>
          <li>You&apos;re responsible for the content and accuracy of your invoices, including client details, amounts and any VAT.</li>
          <li>You&apos;re responsible for your own tax, VAT and accounting obligations. {b} is a tool, not tax or legal advice.</li>
          <li>You must have the right to use any personal data about your clients that you put on an invoice.</li>
          <li>Keep your own records; download PDFs of invoices you need to keep.</li>
        </ul>
      </Section>

      <Section title="6. Bitcoin prices and payments">
        <p>
          Bitcoin prices change constantly. Sats amounts are calculated from third-party price data at the time shown on
          the invoice and are provided as a convenience; the fiat amount on the invoice is the amount owed. We don&apos;t
          guarantee the accuracy of price data. Whether a payment reaches you depends on your own wallet and the Lightning
          network, which we don&apos;t control.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>
          Don&apos;t use {b} for anything illegal, fraudulent or misleading (including fake invoices), to send spam, or to
          attack or overload the service. We may suspend or close accounts that do.
        </p>
      </Section>

      <Section title="8. Availability and changes">
        <p>
          We work to keep {b} running smoothly but can&apos;t promise it will always be available or error-free. We may
          improve or change features; if we ever close the service we&apos;ll give account holders reasonable notice to
          export their invoices.
        </p>
      </Section>

      <Section title="9. Our liability">
        <p>
          Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or anything
          else that can&apos;t legally be limited. Otherwise, we aren&apos;t liable for indirect losses, lost profits or
          losses caused by bitcoin price movements, your wallet, or the Lightning network, and our total liability to you
          is limited to the amount you&apos;ve paid us.
        </p>
      </Section>

      <Section title="10. Ending your account">
        <p>You can stop using {b} at any time and ask us to delete your account.</p>
      </Section>

      <Section title="11. Law">
        <p>
          These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction
          (if you live elsewhere in the UK, you can also bring proceedings where you live).
        </p>
      </Section>
    </InfoPage>
  )
}
