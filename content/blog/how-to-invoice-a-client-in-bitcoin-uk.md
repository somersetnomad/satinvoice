---
title: "How to invoice a client in bitcoin (UK freelancer guide)"
description: "Price in pounds, show the sats at a stated rate, add a Lightning address and keep the records HMRC asks for. Step by step, with a worked example."
date: 2026-11-02
author: Bala Danmeri
tags: [invoicing, lightning, uk, tax]
faq:
  - q: "Can I legally invoice a UK client in bitcoin?"
    a: "Yes. Nothing stops you agreeing with a client to be paid in bitcoin. The simplest approach is to keep the invoice in pounds and offer bitcoin as a way to pay it, which keeps the amount owed clear. HMRC expects your Self Assessment to be completed in pounds sterling."
  - q: "Does my client need a bitcoin wallet to pay?"
    a: "Yes, a Lightning wallet. Free wallets take a few minutes to set up, and the client scans the QR code on your invoice and approves the payment. If a client would rather not, keep a bank-transfer option on the same invoice."
  - q: "What exchange rate should I use on the invoice?"
    a: "Use a live market rate on the day you issue the invoice and print it on the invoice with the date. HMRC's own manual asks for a consistent valuation method and records of how you arrived at it, so the rate and date belong on the document."
  - q: "What if the bitcoin price changes before my client pays?"
    a: "If the invoice says the pounds figure is the amount owed, the price move doesn't change what you're owed. Either accept the sats amount as stated, or re-issue the invoice at the day's rate before the client pays. Decide which you'll do and say so in your terms."
  - q: "Do I pay tax when I get paid in bitcoin?"
    a: "Generally, yes. HMRC treats cryptoassets you receive as having a value in pounds when you receive them, and income that isn't from employment is taxed as trading or miscellaneous income depending on your circumstances. If you later sell or spend the bitcoin at a gain, Capital Gains Tax may apply. Speak to an accountant about your own situation."
---

To invoice a client in bitcoin, **write the invoice in pounds as normal, then show the amount in sats calculated at a stated exchange rate and date, and add your Lightning address (with a QR code) as the way to pay.** The pounds total stays the legal amount owed; the sats figure is a ready-calculated way to settle it. Then record the pounds value of what you actually receive, because HMRC wants everything reported in sterling.

That is the whole method. The rest of this guide shows each step with a worked example, the one choice that trips most people up (Lightning *address* versus Lightning *invoice*), and the records to keep so your Self Assessment is painless.

## Why invoice in pounds and get paid in sats?

Pricing the work in sats sounds purer, but it creates three problems for a UK freelancer:

- **Your client budgets in pounds.** A quote of "1,000,000 sats" means nothing to a finance team until they convert it.
- **The price moves.** Between quote and payment, a sats-priced job can be worth noticeably more or less in pounds, and the client will notice which way it went.
- **HMRC works in sterling.** Your Self Assessment has to be completed in pounds, so a pounds figure needs to exist somewhere anyway ([HMRC](https://www.gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-receive-cryptoassets)).

Freelancers who've written about doing this land in the same place: price in fiat, settle in sats. A recent Stacker News guide advises pricing work in fiat terms and deciding deliberately whether to hold or convert, and one reply sums up the hard part: "Bookkeeping per invoice is the real friction" ([Stacker News](https://stacker.news/items/1580011)).

## Step 1: Agree bitcoin with the client first

Not every client will want to pay in bitcoin, so offer it rather than impose it. Put it in your quote or terms as an option: *"Payment by bank transfer or in bitcoin over the Lightning Network."* For clients who already hold bitcoin, a Lightning payment is quick, cheap and needs no card or bank details.

## Step 2: Write the invoice in pounds, with everything a UK invoice needs

A bitcoin invoice is still a normal invoice, so it needs everything gov.uk lists for any UK invoice ([GOV.UK](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include)):

- A unique invoice number
- Your name or business name, address and contact details
- Your client's name and address
- A clear description of the work
- The date the work was provided (the supply date) and the date of the invoice
- The amounts charged, the VAT amount if you're VAT registered, and the total owed **in pounds**

Add your payment terms and due date too. If you and your client are both VAT registered, you'll need a full VAT invoice, which includes more detail.

## Step 3: Show the sats amount, the rate and the date

Convert the pounds total to sats at a live rate on the day you issue the invoice, and **print the rate and date next to it.** There are 100,000,000 sats in one bitcoin, so the calculation is:

> sats = pounds owed ÷ BTC price in pounds × 100,000,000

Here's a worked example at an illustrative rate of £80,000 per bitcoin:

| Line | Amount |
|---|---|
| Website build (1 × £900) | £900.00 |
| Copywriting (5 pages × £60) | £300.00 |
| **Total owed** | **£1,200.00** |
| Rate used | 1 BTC = £80,000 on 2 Nov 2026 |
| **Pay in sats** | **1,500,000 sats** |

Then add one sentence that settles any future argument: *"Sats calculated at 1 BTC = £80,000 on 2 November 2026. The GBP total is the amount owed."*

Printing the rate and date isn't just good manners. HMRC's own guidance says valuations should use "a consistent methodology" and that "details of the valuation methodology should be kept" ([HMRC Cryptoassets Manual, CRYPTO23000](https://www.gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto23000)). The invoice becomes part of that record.

## Step 4: Add a Lightning address, not a one-off Lightning invoice

This is where most first attempts go wrong. Lightning has two ways to request money, and they behave very differently on an invoice that might sit in someone's inbox for weeks:

| | Lightning **invoice** (BOLT11) | Lightning **address** (you@wallet.com) |
|---|---|---|
| Amount | Fixed, exact amount | Payer chooses (they enter your sats figure) |
| Expiry | Usually expires, often after about 24 hours | Doesn't expire; reusable like an email address |
| Good for | Paying at a till or checkout right now | Invoices with 14 or 30-day terms |

Lightning invoices "usually expire after 24 hours," while a Lightning address is static and reusable ([Bitcoin Well](https://help.bitcoinwell.com/en/articles/9876102-lightning-invoice-vs-payment-address-what-s-the-difference)). If you paste a one-off Lightning invoice into a 30-day invoice, it will almost certainly have expired by the time your client gets round to paying.

So put your **Lightning address** on the invoice, ideally with a QR code of it, and tell the client the exact sats amount to send. If you don't have a Lightning address yet, a self-custodial wallet such as Alby Hub gives you one ([how Lightning addresses work](https://en.bitcoin.it/wiki/Lightning_address)).

## Step 5: Send it, and make it easy to pay

Send the invoice as a PDF and, if you can, a link to an online copy with the QR code. A client paying from their phone can open the link and scan the code from their laptop screen, which is easier than scanning a PDF attachment.

## Step 6: When the payment lands, record the pounds value

When the sats arrive, mark the invoice paid and write down:

- The date received
- The number of sats received
- The BTC price in pounds that day, and where it came from
- The pounds value of the sats on that day

HMRC's record-keeping list for receiving cryptoassets asks for exactly this kind of detail: the type of tokens, the date received, the number received and their "value in pound sterling" ([HMRC](https://www.gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-receive-cryptoassets)).

How it's taxed depends on your circumstances. HMRC's guidance says cryptoassets you receive have a value in pounds, and that income which isn't from employment is usually treated as either trading or miscellaneous income ([HMRC](https://www.gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-receive-cryptoassets)). Separately, if you later sell the bitcoin, swap it, or spend it on goods or services, you may owe Capital Gains Tax on any gain ([HMRC](https://gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-sell-cryptoassets)).

HMRC's pages don't spell out the freelancer case step by step, so if bitcoin becomes a meaningful share of your income, it's worth an hour with an accountant who knows crypto. The records above are exactly what they'll ask you for.

## What if the client pays late and the price has moved?

Because the invoice says the pounds total is what's owed, a late payment doesn't change the debt, only what the sats are worth. You have two clean options, and you should pick one and state it in your terms:

1. **Accept the stated sats amount** whenever it arrives. Simple, and fair if the delay is short.
2. **Re-issue the invoice at the day's rate** before the client pays, so the sats figure matches the pounds owed again.

What you want to avoid is arguing about it after the money has moved. A one-line clause like *"If unpaid after 30 days, the sats amount will be recalculated at the current rate"* settles it in advance.

## Doing all of this without a spreadsheet

You can do every step above by hand: a normal invoice template, a price check, a QR code generator and a spreadsheet for records. I built [SatInvoice](/#app) because I wanted those steps in one place: it prices the invoice in pounds, calculates the sats at the live rate and prints the rate and date, adds your Lightning address as a QR code, produces the PDF, and records the pounds value of the sats when you mark the invoice paid. Your first invoices are free.

For the detail on how pricing, late payments and VAT work in the app, see the [FAQ](/faq).

*This guide is general information, not tax advice.*
