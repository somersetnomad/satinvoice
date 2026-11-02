import type { InvoiceDTO } from './types'
import { formatDate, formatSats, invoiceTotals } from './format'

function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' }

export type BuiltEmail = { subject: string; html: string; text: string }

/** Build a client-safe, inline-styled HTML email for an invoice. */
export function buildInvoiceEmail(
  inv: InvoiceDTO,
  personalMessage?: string,
  publicUrl?: string,
  brandName = 'SatInvoice',
  walletReferralUrl?: string,
  /** Free-plan credit line; null/undefined = no credit (paid plan). */
  credit?: { url: string; host: string } | null
): BuiltEmail {
  const brand = esc(brandName)
  const symbol = SYMBOLS[inv.currency] ?? ''
  const fiatTotal = `${symbol}${inv.totalFiat.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  const subject = `Invoice ${inv.number} from ${inv.senderName} — ${fiatTotal} (${formatSats(inv.totalSats)} sats)`

  const { subtotal, vat } = invoiceTotals(inv.items, inv.vatRate)
  const hasVat = !!inv.vatRate && inv.vatRate > 0
  const vatRows = hasVat
    ? `<tr><td align="right" style="padding:4px 8px;color:#6a6a6a;font-size:13px;">Subtotal</td><td align="right" style="padding:4px 8px;color:#1a1a1a;font-size:13px;width:140px;">${symbol}${subtotal.toFixed(2)}</td></tr>
       <tr><td align="right" style="padding:4px 8px;color:#6a6a6a;font-size:13px;">VAT (${inv.vatRate}%)</td><td align="right" style="padding:4px 8px;color:#1a1a1a;font-size:13px;width:140px;">${symbol}${vat.toFixed(2)}</td></tr>`
    : ''

  const rows = inv.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;color:#1a1a1a;">${esc(it.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;color:#1a1a1a;">${it.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;color:#1a1a1a;">${symbol}${it.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#1a1a1a;">${symbol}${(it.quantity * it.unitPrice).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const msgBlock = personalMessage?.trim()
    ? `<div style="margin:0 0 20px;padding:12px 16px;background:#fff7ed;border-left:3px solid #f97316;border-radius:6px;color:#4a4a4a;font-size:14px;line-height:1.6;white-space:pre-line;">${esc(personalMessage.trim())}</div>`
    : ''

  const webBlock = publicUrl
    ? `<div style="margin:0 0 20px;text-align:center;">
         <a href="${esc(publicUrl)}" style="display:inline-block;padding:12px 28px;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;">View invoice online &#8594;</a>
         <p style="margin:8px 0 0;font-size:11px;color:#b3b3b3;word-break:break-all;">${esc(publicUrl)}</p>
       </div>`
    : ''

  const lnBlock = inv.lightningAddress
    ? `<div style="margin:24px 0 0;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
         <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;color:#ea580c;">&#9889; PAY INSTANTLY OVER LIGHTNING</p>
         <p style="margin:0;font-family:monospace;font-size:15px;font-weight:600;color:#1a1a1a;word-break:break-all;">${esc(inv.lightningAddress)}</p>
         <p style="margin:6px 0 0;font-size:12px;color:#8a8a8a;">Scan this Lightning Address with any Lightning wallet to pay ${formatSats(inv.totalSats)} sats.</p>
         ${walletReferralUrl ? `<p style="margin:6px 0 0;font-size:12px;color:#8a8a8a;">New to Lightning? <a href="${esc(walletReferralUrl)}" style="color:#ea580c;">Get a free wallet &#8594;</a></p>` : ''}
       </div>`
    : ''

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4f0;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="background:#ffffff;border:1px solid #e8e4dc;border-radius:12px;overflow:hidden;">
    <div style="padding:20px 28px;border-bottom:2px solid #f97316;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <p style="margin:0;font-size:20px;font-weight:800;color:#1a1a1a;">INVOICE</p>
        <p style="margin:4px 0 0;font-family:monospace;font-size:13px;color:#8a8a8a;">${esc(inv.number)}</p>
      </div>
      <span style="background:#fff7ed;color:#ea580c;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;">${inv.status === 'paid' ? 'PAID' : 'PAYMENT DUE'}</span>
    </div>
    <div style="padding:24px 28px;">
      ${webBlock}
      ${msgBlock}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="vertical-align:top;width:50%;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;color:#a3a3a3;">FROM</p>
            <p style="margin:0 0 8px;font-weight:600;color:#1a1a1a;">${esc(inv.senderName)}</p>
            <p style="margin:0;font-size:13px;color:#6a6a6a;white-space:pre-line;">${esc(inv.senderDetails)}</p>
          </td>
          <td style="vertical-align:top;width:50%;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;color:#a3a3a3;">BILL TO</p>
            <p style="margin:0 0 8px;font-weight:600;color:#1a1a1a;">${esc(inv.clientName)}</p>
            <p style="margin:0;font-size:13px;color:#6a6a6a;white-space:pre-line;">${esc(inv.clientDetails)}</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr>
          <th align="left" style="padding:8px;border-bottom:2px solid #e8e4dc;font-size:11px;letter-spacing:1px;color:#a3a3a3;">DESCRIPTION</th>
          <th align="right" style="padding:8px;border-bottom:2px solid #e8e4dc;font-size:11px;letter-spacing:1px;color:#a3a3a3;">QTY</th>
          <th align="right" style="padding:8px;border-bottom:2px solid #e8e4dc;font-size:11px;letter-spacing:1px;color:#a3a3a3;">UNIT</th>
          <th align="right" style="padding:8px;border-bottom:2px solid #e8e4dc;font-size:11px;letter-spacing:1px;color:#a3a3a3;">AMOUNT</th>
        </tr>
        ${rows}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
        ${vatRows}
        <tr>
          <td align="right" style="padding:4px 8px;color:#6a6a6a;font-size:14px;">Total (${esc(inv.currency)})${hasVat ? ' incl. VAT' : ''}</td>
          <td align="right" style="padding:4px 8px;font-weight:700;color:#1a1a1a;font-size:15px;width:140px;">${fiatTotal}</td>
        </tr>
        <tr>
          <td align="right" style="padding:12px 8px;background:#fff7ed;border-radius:6px 0 0 6px;color:#7c2d12;font-size:14px;">&#8776; Pay in sats</td>
          <td align="right" style="padding:12px 8px;background:#fff7ed;border-radius:0 6px 6px 0;font-family:monospace;font-weight:800;color:#9a3412;font-size:18px;width:140px;">${formatSats(inv.totalSats)} sats</td>
        </tr>
      </table>
      <p style="margin:8px 0 0;text-align:right;font-size:11px;color:#b3b3b3;">Sats calculated at 1 BTC = ${symbol}${inv.fxRate.toLocaleString('en-GB', { maximumFractionDigits: 2 })} on ${formatDate(inv.createdAt)}. The ${esc(inv.currency)} total is the amount owed.</p>
      ${lnBlock}
      ${inv.notes ? `<p style="margin:20px 0 0;font-size:13px;color:#6a6a6a;white-space:pre-line;">${esc(inv.notes)}</p>` : ''}
      <p style="margin:8px 0 0;text-align:right;font-size:12px;color:#8a8a8a;">Due: ${inv.dueDate ? formatDate(inv.dueDate) : 'On receipt'}</p>
    </div>
    ${credit ? `<div style="padding:14px 28px;background:#faf9f6;border-top:1px solid #eee;text-align:center;">
      <p style="margin:0;font-size:11px;color:#b3b3b3;">Invoiced with ${brand} &#9889; — bitcoin invoices for freelancers · <a href="${esc(credit.url)}" style="color:#ea580c;text-decoration:none;font-weight:600;">${esc(credit.host)}</a></p>
    </div>` : ''}
  </div>
</div>
</body></html>`

  const text = [
    `INVOICE ${inv.number} (${inv.status === 'paid' ? 'PAID' : 'PAYMENT DUE'})`,
    `From: ${inv.senderName}`,
    `Bill to: ${inv.clientName}`,
    publicUrl ? `View online: ${publicUrl}` : '',
    '',
    ...inv.items.map(
      (it) => `- ${it.description} × ${it.quantity} @ ${symbol}${it.unitPrice.toFixed(2)} = ${symbol}${(it.quantity * it.unitPrice).toFixed(2)}`
    ),
    '',
    `Total: ${fiatTotal}  ≈ ${formatSats(inv.totalSats)} sats`,
    ...(hasVat ? [`Subtotal: ${symbol}${subtotal.toFixed(2)}  VAT (${inv.vatRate}%): ${symbol}${vat.toFixed(2)}`] : []),
    `Sats calculated at 1 BTC = ${symbol}${inv.fxRate.toLocaleString('en-GB', { maximumFractionDigits: 2 })} on ${formatDate(inv.createdAt)}. The ${inv.currency} total is the amount owed.`,
    inv.lightningAddress ? `Pay over Lightning: ${inv.lightningAddress}` : '',
    inv.lightningAddress && walletReferralUrl ? `New to Lightning? Get a free wallet: ${walletReferralUrl}` : '',
    `Due: ${inv.dueDate ? formatDate(inv.dueDate) : 'On receipt'}`,
    '',
    credit ? `Invoiced with ${brandName} — bitcoin invoices for freelancers: ${credit.url}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
