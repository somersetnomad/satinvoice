---
title: "Lightning address or Lightning invoice on an invoice?"
description: "Why a Lightning address beats a one-off Lightning invoice on a 14 or 30-day invoice, when the invoice is better, and how to match payments to invoices."
date: 2026-11-04
author: Bala Danmeri
tags: [lightning, invoicing, how-to]
faq:
  - q: "Can a Lightning invoice be paid after it expires?"
    a: "No. Once a Lightning invoice (BOLT11) passes its expiry time, wallets will refuse to pay it and you'll need to create a new one. If no expiry is set in the invoice, the BOLT11 default is 3,600 seconds, one hour. Many wallets set a longer expiry, often 24 hours, but that's still far shorter than normal payment terms."
  - q: "Can I reuse a Lightning invoice for a second payment?"
    a: "No. A Lightning invoice is a one-off request for one payment. For a second payment you create a new invoice. A Lightning address is the reusable option: the payer's wallet fetches a fresh invoice from it every time."
  - q: "How do I know which client paid my Lightning address?"
    a: "Match on the exact sats amount and the date first, since each invoice you issue asks for a specific sats figure. If your Lightning address provider supports payer comments, ask clients to put the invoice number in the comment box. For large invoices, you can also send a fresh Lightning invoice for that one payment when the client is ready to pay."
  - q: "What is a BOLT12 offer, and should I use one instead?"
    a: "A BOLT12 offer is a reusable payment request that became part of the official Lightning specification in September 2024. It solves the same problem as a Lightning address without relying on a web server. Wallet support is still uneven, so for invoices you send to clients today a Lightning address is the safer default."
---

On a freelance invoice, **put your Lightning address (you@wallet.com) on it, not a one-off Lightning invoice.** A Lightning invoice is a single-use payment request that expires, often within an hour to a day, so it will be dead long before a 14 or 30-day invoice is paid. A Lightning address never expires and works for any amount: your client scans it, types in the sats figure from your invoice, and their wallet fetches a fresh invoice behind the scenes.

The one time a Lightning invoice is the better choice is when the client is ready to pay *right now*, for example on a call or at the end of a job. Below is how each one works, what goes wrong with each, and how to tell which client paid when everyone pays the same address.

## The difference in one table

| | Lightning **invoice** (BOLT11, starts `lnbc…`) | Lightning **address** (`you@wallet.com`) |
|---|---|---|
| What it is | A one-off payment request | A reusable identifier, like an email address |
| Amount | Usually fixed in the invoice | The payer enters it |
| Expiry | Yes: 1 hour by default, wallets often set up to 24 hours | No |
| Can be paid more than once | No | Yes, any number of times |
| Needs a web server | No | Yes, your provider's |
| Matches payment to invoice | Automatically (one invoice, one payment) | You match it by amount, date or comment |
| Best for | Paying now, on a call or at a checkout | Invoices with payment terms |

## How a Lightning invoice works, and why it expires

A Lightning invoice is the long `lnbc…` string (or QR code) your wallet produces when you press "Receive" and enter an amount. It's built to the BOLT11 specification and it's meant to be paid once.

It also has a built-in expiry. If the person creating the invoice doesn't set one, the BOLT11 default is 3,600 seconds, which is one hour ([BOLT11 default, as implemented in the `lightning-invoice` library](https://docs.rs/lightning-invoice/latest/lightning_invoice/constant.DEFAULT_EXPIRY_TIME.html)). Many wallets choose longer: Bitcoin Well's help centre says a Lightning invoice "usually expires after 24 hours" ([Bitcoin Well](https://help.bitcoinwell.com/en/articles/9876102-lightning-invoice-vs-payment-address-what-s-the-difference)).

Either way, the arithmetic doesn't work for invoicing. If you email a client an invoice on the 1st with 30-day terms and paste a Lightning invoice into it, it has to survive up to 720 hours. At a 24-hour expiry it's dead on the 2nd. Your client scans it on the 28th, their wallet says it's expired, and you're now chasing a payment that should have been easy.

## How a Lightning address works

A Lightning address looks like an email address and is defined in a short spec called LUD-16. It uses "the format `<username>@<domainname>`", and when someone pays it, their wallet asks the domain at `https://<domain>/.well-known/lnurlp/<username>` how to pay you ([LUD-16](https://github.com/lnurl/luds/blob/luds/16.md)).

What happens next is the clever part. The payer enters an amount, and their wallet asks your provider for a brand-new Lightning invoice for exactly that amount, then pays it. As the Bitcoin Wiki puts it, "Each payment still fetches a fresh BOLT 11 invoice over HTTPS" ([Bitcoin Wiki](https://en.bitcoin.it/wiki/Lightning_address)). So the address itself never expires, but every payment still gets its own fresh invoice under the hood.

That's why it suits invoices. The address on your invoice works on day 1 and on day 45.

## What can go wrong with a Lightning address

A Lightning address isn't perfect, and it's worth knowing the weak spots before a client hits one.

**The client types the wrong amount.** Because the payer chooses the amount, they can send 150,000 sats instead of 1,500,000. Check the amount when it arrives against the sats figure on the invoice, and ask for the balance if it's short. Printing the sats figure in large type next to the QR code helps.

**Your provider's server is down.** The address depends on a web server. The Bitcoin Wiki notes that "If the HTTPS endpoint is unavailable, payers cannot resolve the address even when the Lightning node is online" ([Bitcoin Wiki](https://en.bitcoin.it/wiki/Lightning_address)). Keeping a bank-transfer option on the invoice covers you if that happens.

**The provider can see payments.** The same page notes that "The payer's IP is visible to that server" and that successive payments to the same address "can be correlated by the server even though each invoice is unique" ([Bitcoin Wiki](https://en.bitcoin.it/wiki/Lightning_address)). For most freelance invoicing that's acceptable, but choose a provider you're comfortable with, or run your own node.

**Matching payments to invoices is on you.** Every client pays the same address, so your wallet shows "received 1,500,000 sats" rather than "INV-0042 paid". That's the bit most guides skip, so it gets its own section.

## How to tell which client paid

With a Lightning invoice, one invoice equals one payment, so there's nothing to match. With a Lightning address you need a method. In order of reliability:

1. **Match on the exact sats amount and date.** Each invoice asks for a specific figure, such as 1,500,000 sats. Two open invoices rarely ask for exactly the same number, and the payment date narrows it further.
2. **Ask for the invoice number in the payment comment.** Lightning addresses can accept a short note from the payer. The LNURL spec for this (LUD-12) has the provider say how many characters it accepts, and the payer's wallet then shows a comment box ([LNURL specs](https://github.com/lnurl/luds)). If your provider supports it, add a line to the invoice: *"Please put INV-0042 in the payment comment."*
3. **For big invoices, send a fresh Lightning invoice at payment time.** Keep the Lightning address on the invoice, but if the client says "I'm paying now", create a one-off invoice for the exact amount in your wallet and send it to them. It's paid within minutes, so expiry doesn't matter, and the amount is fixed so there's no typo risk.

Once you know which invoice was paid, record the date, the sats received and their pounds value that day. HMRC wants your records in sterling; the full layout is in [how to record bitcoin payments for HMRC](/blog/how-to-record-bitcoin-payments-for-hmrc).

## A worked example: INV-0042

Say I invoice a client £1,200 on 2 November with 30-day terms, at an illustrative rate of £80,000 per bitcoin. That's 1,500,000 sats.

| Approach | What's on the invoice | What happens if the client pays on 28 November |
|---|---|---|
| One-off Lightning invoice | `lnbc15m1…` QR, 24-hour expiry | Wallet says expired. Client emails me, I make a new one, payment is delayed. |
| Lightning address | `me@wallet.com` QR, "Pay 1,500,000 sats", "Put INV-0042 in the comment" | Client scans, types 1,500,000, adds INV-0042, pays. I match it in seconds. |
| Address + fresh invoice at payment | Address on the invoice; client says "paying now" on the 28th | I send a 1,500,000-sat Lightning invoice, it's paid in minutes, no matching needed. |

If the price has moved a lot by the 28th, the sats figure no longer matches the £1,200 owed. That's a separate decision (accept the original sats, or re-price), covered in [how to invoice a client in bitcoin](/blog/how-to-invoice-a-client-in-bitcoin-uk).

## What about BOLT12 offers?

BOLT12 "offers" are the Lightning protocol's own answer to this problem: a reusable payment request that doesn't depend on a web server. BOLT12 was merged into the official Lightning specification in September 2024 ([No Bullshit Bitcoin](https://nobsbitcoin.com/bolt12-offers-officially-merged-into-lightning-spec)).

The catch is support. Not every wallet can pay one yet; one 2026 review found that LND, a widely used Lightning implementation, "does not natively support BOLT12 as of mid-2026" and that most wallets still default to BOLT11 invoices ([Spark](https://www.spark.money/research/lightning-bolt12-adoption-progress)). If your client's wallet can't read it, they can't pay. For invoices going to clients today, a Lightning address is the safer default. Worth revisiting as support spreads.

## The short version

- **Invoice with payment terms:** Lightning address, with the sats amount printed clearly and a request for the invoice number in the comment.
- **Client paying right now:** a one-off Lightning invoice for the exact amount.
- **Large invoice:** both. Address on the invoice, fresh Lightning invoice when they're ready.
- **Always:** a bank-transfer fallback on the same invoice.

[SatInvoice](/#app) is built around the first option: it puts your Lightning address on the invoice as a QR code, next to the sats amount calculated at a stated rate and date, and records the pounds value when you mark the invoice paid. Your first invoices are free. If you don't have a Lightning address yet, the [FAQ](/faq) explains what you need.

*This guide is general information about how Lightning payments work, not financial advice.*
