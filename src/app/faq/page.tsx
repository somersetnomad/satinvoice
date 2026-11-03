import type { Metadata } from 'next'
import { InfoPage, Section } from '@/components/info-page'
import { getPublicConfigSafe } from '@/lib/settings'
import { getOperatorInfo } from '@/lib/operator'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getPublicConfigSafe()
  return {
    title: `FAQ — ${brandName}`,
    description: `How ${brandName} works: pricing in pounds, getting paid in sats over Lightning, late payments, VAT and your data.`,
  }
}

const sats = (n: number) => new Intl.NumberFormat('en-GB').format(n)

export default async function FaqPage() {
  const cfg = await getPublicConfigSafe()
  const op = getOperatorInfo()
  const b = cfg.brandName
  return (
    <InfoPage brandName={b} title="Frequently asked questions" intro={`Everything you need to know about invoicing in pounds and getting paid in bitcoin with ${b}.`}>
      <Section title={`What is ${b}?`}>
        <p>
          An invoicing tool for freelancers and small businesses who want to get paid in bitcoin. You write the invoice in
          pounds, euros or dollars as normal; {b} shows your client the equivalent in sats (the smallest unit of bitcoin)
          and a Lightning QR code they can scan to pay you instantly.
        </p>
      </Section>

      <Section title="How does pricing in pounds but paying in sats work?">
        <p>
          When you create an invoice, {b} takes the live bitcoin price and converts your total into sats. That figure,
          and the rate and date it was calculated at, are printed on the invoice, for example:{' '}
          <em>&quot;Sats calculated at 1 BTC = £80,000 on 2 Nov 2026. The GBP total is the amount owed.&quot;</em>
        </p>
        <p>
          The amount in pounds is what your client owes you. The sats figure is a convenient, ready-calculated way to pay
          it in bitcoin at the rate on the day you issued the invoice.
        </p>
        <p>
          For a step-by-step walkthrough with a worked example, see{' '}
          <a href="/blog/how-to-invoice-a-client-in-bitcoin-uk">how to invoice a client in bitcoin</a>.
        </p>
      </Section>

      <Section title="What if my client pays late and the bitcoin price has moved?">
        <p>Nothing expires: your Lightning address accepts a payment whenever the client sends it. You have two choices:</p>
        <ul>
          <li>
            <strong>Accept the original sats amount</strong>: simplest, and fine for quick payments when the price hasn&apos;t
            moved much.
          </li>
          <li>
            <strong>Re-price it</strong>: in your Invoices list, press the re-price button (circular arrows) on any unpaid
            invoice. {b} recalculates the sats at today&apos;s rate; the amount owed in pounds stays exactly the same. Your
            client&apos;s link, PDF and QR update straight away.
          </li>
        </ul>
        <p>
          When you mark an invoice as paid, {b} also records that day&apos;s rate and shows what the sats were worth in
          pounds at the time of payment, which is handy for both your books and your client&apos;s. For what to record
          and how long to keep it, see{' '}
          <a href="/blog/how-to-record-bitcoin-payments-for-hmrc">how to record bitcoin payments for HMRC</a>.
        </p>
      </Section>

      <Section title="Do you hold my money?">
        <p>
          No. Your clients pay your own Lightning address directly; the money goes straight to your wallet and never passes
          through {b}. We never see or hold your funds, and we take no percentage of what you&apos;re paid.
        </p>
      </Section>

      <Section title="What do I need to get paid?">
        <p>
          A Lightning address from any Lightning wallet: it looks like an email address, e.g. <code>you@getalby.com</code>.
          Add it to your invoice and your client can pay by scanning the QR code.{' '}
          {cfg.walletReferralUrl ? (
            <>
              Don&apos;t have one?{' '}
              <a href={cfg.walletReferralUrl} target="_blank" rel="noopener sponsored">
                Get a free Alby wallet
              </a>
              .
            </>
          ) : null}
        </p>
      </Section>

      <Section title="Does my client need an account?">
        <p>
          No. They get a private link to a web version of the invoice (plus a PDF they can download) and pay from any
          Lightning wallet. Only the private link can open it; invoices aren&apos;t listed or searchable anywhere.
        </p>
      </Section>

      <Section title="How much does it cost?">
        <p>
          Every account gets {cfg.freeInvoices} invoices free, no card needed. After that, a one-time payment of{' '}
          {sats(cfg.unlockSats)} sats unlocks unlimited invoices forever: no subscription, and no fees on what your
          clients pay you.
        </p>
      </Section>

      <Section title="Can I charge VAT?">
        <p>
          Yes. Enter your VAT rate (e.g. 20%) on the invoice and {b} shows the subtotal, VAT and total, and calculates the
          sats on the VAT-inclusive total. Put your VAT registration number in &quot;Your details&quot; so it appears on the
          invoice. You&apos;re responsible for charging and reporting VAT correctly; if in doubt, ask your accountant.
        </p>
      </Section>

      <Section title="Can I send invoices by email?">
        <p>
          Yes. Send an invoice straight to your client with the PDF attached, or open it in your own email app. Replies
          from your client come back to the email address on your account.
        </p>
      </Section>

      <Section title="Is my data safe?">
        <p>
          Passwords are stored as one-way hashes, all traffic is encrypted, and your invoices are private to your account.
          We don&apos;t use tracking or advertising cookies. See the <a href="/privacy">privacy policy</a> for the details.
        </p>
      </Section>

      <Section title="Who runs it?">
        <p>
          {b} is run by {op.name}, based in {op.location}. Questions? Email{' '}
          <a href={`mailto:${op.contact}`}>{op.contact}</a>. More on the <a href="/about">About page</a>.
        </p>
      </Section>
    </InfoPage>
  )
}
