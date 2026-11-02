import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'
import type { InvoiceDTO } from '@/lib/types'

/**
 * Server-side PDF rendering of an invoice (A4, vector text, real QR code).
 * Uses only pdf-lib's built-in Helvetica, so it needs no font files and runs
 * anywhere (Vercel functions included). Characters Helvetica can't encode
 * (emoji, some scripts) are replaced so rendering never throws.
 */

const A4 = { w: 595.28, h: 841.89 }
const M = 48 // page margin
const ORANGE = rgb(0.976, 0.451, 0.086) // #f97316
const INK = rgb(0.1, 0.1, 0.1)
const MUTED = rgb(0.42, 0.42, 0.42)
const FAINT = rgb(0.64, 0.64, 0.64)
const LINE = rgb(0.9, 0.89, 0.86)
const TINT = rgb(1, 0.969, 0.929) // #fff7ed
const DEEP = rgb(0.604, 0.204, 0.071) // #9a3412

type Fonts = { regular: PDFFont; bold: PDFFont; mono: PDFFont; monoBold: PDFFont }

const fmtMoney = (n: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n)
const fmtNum = (n: number) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
const fmtSats = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const fmtQty = (n: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 }).format(n)
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Replace characters the standard font cannot encode. */
function makeSanitizer(font: PDFFont) {
  const ok = new Map<string, boolean>()
  return (text: string): string => {
    let out = ''
    for (const ch of text.replace(/\r/g, '').replace(/[   ]/g, ' ')) {
      if (ch === '\n') {
        out += ch
        continue
      }
      let good = ok.get(ch)
      if (good === undefined) {
        try {
          font.encodeText(ch)
          good = true
        } catch {
          good = false
        }
        ok.set(ch, good)
      }
      out += good ? ch : ''
    }
    return out
  }
}

/** Word-wrap text (respecting newlines) to a max width. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      // Hard-break words longer than the column.
      let w = word
      while (font.widthOfTextAtSize(w, size) > maxWidth && w.length > 1) {
        let cut = w.length - 1
        while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxWidth) cut--
        lines.push(w.slice(0, cut))
        w = w.slice(cut)
      }
      line = w
    }
    lines.push(line)
  }
  return lines
}

export async function renderInvoicePdf(
  inv: InvoiceDTO,
  opts: { brandName: string; clientView?: boolean }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Invoice ${inv.number}`)
  doc.setAuthor(inv.senderName)
  doc.setSubject(`Invoice ${inv.number} for ${inv.clientName}`)
  doc.setCreator(opts.brandName)
  doc.setProducer(opts.brandName)

  const f: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
    monoBold: await doc.embedFont(StandardFonts.CourierBold),
  }
  const clean = makeSanitizer(f.regular)
  const cur = inv.currency

  let page: PDFPage = doc.addPage([A4.w, A4.h])
  let y = A4.h - M

  const text = (s: string, x: number, yy: number, size: number, font: PDFFont = f.regular, color = INK) =>
    page.drawText(clean(s), { x, y: yy, size, font, color })
  const right = (s: string, xRight: number, yy: number, size: number, font: PDFFont = f.regular, color = INK) => {
    const t = clean(s)
    page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y: yy, size, font, color })
  }
  const footer = () => {
    const t = clean(`Issued with ${opts.brandName} - invoices on a bitcoin standard`)
    page.drawText(t, {
      x: (A4.w - f.regular.widthOfTextAtSize(t, 8)) / 2,
      y: 28,
      size: 8,
      font: f.regular,
      color: FAINT,
    })
  }
  const ensure = (needed: number) => {
    if (y - needed >= M + 30) return
    footer()
    page = doc.addPage([A4.w, A4.h])
    y = A4.h - M
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  page.drawRectangle({ x: M, y: y - 22, width: 26, height: 26, color: ORANGE })
  // Simple bolt mark drawn as a polygon-ish path.
  page.drawSvgPath('M 15 3 L 6 15 L 12 15 L 10 23 L 20 10 L 14 10 Z', {
    x: M,
    y: y + 4,
    scale: 1,
    color: rgb(1, 1, 1),
  })
  text(opts.brandName, M + 34, y - 9, 13, f.bold)
  text('INVOICE', A4.w - M - f.bold.widthOfTextAtSize('INVOICE', 22), y - 16, 22, f.bold)
  y -= 40

  const status =
    inv.status === 'paid' ? 'PAID' : opts.clientView || inv.status === 'sent' ? 'PAYMENT DUE' : 'DRAFT'
  text(inv.number, M, y, 11, f.mono, MUTED)
  const badgeW = f.bold.widthOfTextAtSize(status, 8) + 14
  page.drawRectangle({
    x: A4.w - M - badgeW,
    y: y - 4,
    width: badgeW,
    height: 15,
    color: inv.status === 'paid' ? rgb(0.86, 0.97, 0.9) : TINT,
  })
  right(status, A4.w - M - 7, y, 8, f.bold, inv.status === 'paid' ? rgb(0.02, 0.45, 0.25) : DEEP)
  y -= 18
  right(`Issued: ${fmtDate(inv.createdAt)}`, A4.w - M, y, 9, f.regular, MUTED)
  y -= 13
  right(`Due: ${inv.dueDate ? fmtDate(inv.dueDate) : 'On receipt'}`, A4.w - M, y, 9, f.regular, MUTED)
  y -= 14
  page.drawRectangle({ x: M, y, width: A4.w - 2 * M, height: 1.5, color: ORANGE })
  y -= 26

  /* ── From / Bill to ─────────────────────────────────────────────────── */
  const colW = (A4.w - 2 * M - 24) / 2
  const block = (label: string, name: string, details: string, x: number) => {
    let yy = y
    page.drawText(label, { x, y: yy, size: 8, font: f.bold, color: FAINT })
    yy -= 15
    for (const l of wrap(clean(name), f.bold, 11, colW)) {
      page.drawText(l, { x, y: yy, size: 11, font: f.bold, color: INK })
      yy -= 14
    }
    for (const l of wrap(clean(details), f.regular, 9, colW)) {
      page.drawText(l, { x, y: yy, size: 9, font: f.regular, color: MUTED })
      yy -= 12
    }
    return yy
  }
  const yFrom = block('FROM', inv.senderName, inv.senderDetails, M)
  const yTo = block('BILL TO', inv.clientName, inv.clientDetails, M + colW + 24)
  y = Math.min(yFrom, yTo) - 18

  /* ── Line items ─────────────────────────────────────────────────────── */
  const cQty = A4.w - M - 220
  const cUnit = A4.w - M - 100
  const cAmt = A4.w - M
  const descW = cQty - 40 - M
  const tableHeader = () => {
    text('DESCRIPTION', M, y, 8, f.bold, FAINT)
    right('QTY', cQty, y, 8, f.bold, FAINT)
    right(`UNIT (${cur})`, cUnit, y, 8, f.bold, FAINT)
    right(`AMOUNT (${cur})`, cAmt, y, 8, f.bold, FAINT)
    y -= 8
    page.drawRectangle({ x: M, y, width: A4.w - 2 * M, height: 1, color: LINE })
    y -= 16
  }
  tableHeader()
  for (const it of inv.items) {
    const lines = wrap(clean(it.description), f.regular, 10, descW)
    ensure(lines.length * 13 + 12)
    if (y > A4.h - M - 5) tableHeader() // fresh page
    const top = y
    lines.forEach((l, i) => page.drawText(l, { x: M, y: top - i * 13, size: 10, font: f.regular, color: INK }))
    right(fmtQty(it.quantity), cQty, top, 10)
    right(fmtNum(it.unitPrice), cUnit, top, 10)
    right(fmtNum(it.quantity * it.unitPrice), cAmt, top, 10, f.bold)
    y = top - lines.length * 13 - 6
    page.drawRectangle({ x: M, y: y + 2, width: A4.w - 2 * M, height: 0.5, color: LINE })
    y -= 12
  }

  /* ── Totals ─────────────────────────────────────────────────────────── */
  ensure(110)
  y -= 4
  const totalsX = A4.w - M - 230
  text(`Total (${cur})`, totalsX, y, 10, f.regular, MUTED)
  right(fmtMoney(inv.totalFiat, cur), cAmt, y, 12, f.bold)
  y -= 14
  page.drawRectangle({ x: totalsX - 10, y: y - 26, width: cAmt - totalsX + 10, height: 32, color: TINT })
  text('Pay in sats', totalsX, y - 15, 10, f.regular, DEEP)
  right(`${fmtSats(inv.totalSats)} sats`, cAmt - 8, y - 16, 14, f.monoBold, DEEP)
  y -= 42
  right(
    `Rate at issue: 1 BTC = ${fmtMoney(inv.fxRate, cur)}`,
    cAmt,
    y,
    8,
    f.regular,
    FAINT
  )
  y -= 26

  /* ── Lightning payment ──────────────────────────────────────────────── */
  if (inv.lightningAddress) {
    const qrSize = 96
    ensure(qrSize + 20)
    page.drawRectangle({ x: M, y: y - qrSize - 4, width: A4.w - 2 * M, height: 0.5, color: LINE })
    const qr = QRCode.create(inv.lightningAddress, { errorCorrectionLevel: 'M' })
    const n = qr.modules.size
    const quiet = 2
    const cell = qrSize / (n + quiet * 2)
    const qx = M
    const qy = y - qrSize + 4
    page.drawRectangle({ x: qx, y: qy, width: qrSize, height: qrSize, color: rgb(1, 1, 1) })
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) {
          page.drawRectangle({
            x: qx + (c + quiet) * cell,
            y: qy + qrSize - (r + quiet + 1) * cell,
            width: cell + 0.05,
            height: cell + 0.05,
            color: INK,
          })
        }
      }
    }
    const tx = M + qrSize + 18
    text('LIGHTNING PAYMENT', tx, y - 22, 9, f.bold, ORANGE)
    text(inv.lightningAddress, tx, y - 40, 12, f.monoBold)
    text(`Scan with any Lightning wallet and send ${fmtSats(inv.totalSats)} sats.`, tx, y - 56, 9, f.regular, MUTED)
    y -= qrSize + 24
  }

  /* ── Notes ──────────────────────────────────────────────────────────── */
  if (inv.notes) {
    const lines = wrap(clean(inv.notes), f.regular, 9, A4.w - 2 * M)
    ensure(lines.length * 12 + 20)
    text('NOTES', M, y, 8, f.bold, FAINT)
    y -= 14
    for (const l of lines) {
      ensure(14)
      text(l, M, y, 9, f.regular, MUTED)
      y -= 12
    }
  }

  footer()
  return doc.save()
}

/** Safe download filename, e.g. "INV-2026-0001.pdf". */
export const pdfFilename = (number: string) => `${number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`
