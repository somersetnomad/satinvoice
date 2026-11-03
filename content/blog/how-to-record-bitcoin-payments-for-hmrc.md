---
title: "How to record bitcoin payments for HMRC (UK freelancers)"
description: "What to write down when a client pays you in sats, how HMRC wants it valued in pounds, and how long to keep it. With a ledger layout and worked example."
date: 2026-11-03
author: Bala Danmeri
tags: [tax, records, hmrc, uk]
faq:
  - q: "Do I have to record every single Lightning payment separately?"
    a: "Yes. HMRC's guidance says you must keep separate records for the tokens you receive, including the date, the number of tokens and their value in pound sterling. One line per payment in a simple ledger covers it."
  - q: "Which exchange rate should I use to value sats in pounds?"
    a: "HMRC doesn't name a source. Its manual says to take reasonable care to arrive at an appropriate valuation using a consistent methodology, and to keep details of that methodology. Pick one reputable price source, use it every time, and write down which one it is."
  - q: "My wallet keeps a transaction history. Is that enough?"
    a: "Keep it, but don't rely on it alone. HMRC's manual points out that exchanges may only keep records for a short period and may no longer exist when you do your tax return, so the onus is on you to keep your own records. A wallet history also won't show the pounds value or which invoice each payment settled."
  - q: "How long do I need to keep my bitcoin payment records?"
    a: "If you're self-employed, at least 5 years after the 31 January submission deadline for the tax year. Records for the 2026 to 2027 tax year, for example, would need keeping until at least 31 January 2033."
  - q: "If I spend the sats I was paid, is that taxable too?"
    a: "It can be. HMRC lists using tokens to pay for goods or services as a disposal, and Capital Gains Tax may be due on any gain. That's a separate record from the income, so log disposals as well as receipts."
---

To record a bitcoin payment for HMRC, **write down, for every payment you receive: the date, the number of sats, the pounds value on that day, the rate and where you got it, and which invoice it paid.** Keep those records in pounds sterling, alongside your normal business records, for at least 5 years after the 31 January Self Assessment deadline for that tax year. If you later spend, sell or swap the sats, log that too, because it's a separate taxable event.

That's the core of it. Below is the ledger I'd use, a worked example across three invoices, and the HMRC wording behind each column, so you can see this isn't guesswork.

*This is general information, not tax advice. How your bitcoin income is taxed depends on your circumstances, so check your own position with an accountant.*

## What HMRC says you must keep

HMRC's guidance on receiving cryptoassets says you "must keep separate records for the tokens you receive", including ([HMRC](https://www.gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-receive-cryptoassets)):

- the type of tokens
- the date you received them
- the number of tokens you received
- the number of tokens you have in total
- their value in pound sterling
- bank statements
- the details of any disposal

HMRC's internal manual adds wallet addresses to that list, "in case these are needed for an enquiry or review" ([HMRC Cryptoassets Manual, CRYPTO10400](https://gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto10400)).

And because your Self Assessment return has to be completed in pound sterling, every line needs a pounds figure, not just a sats figure.

## Why your wallet history isn't enough on its own

It's tempting to think "it's all on my wallet, I can export it later". HMRC's manual warns against exactly that: exchanges "may only keep records of transactions for a short period" and "may no longer be in existence when an individual completes a tax return", so "the onus is therefore on the individual to keep their own records" ([CRYPTO10400](https://gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto10400)).

There's a second problem specific to freelancers. A wallet history shows that 1,500,000 sats arrived on a Tuesday. It doesn't show that they paid invoice INV-0042 for a website build, or what they were worth in pounds. You need that link between the payment and the work.

So download your wallet history if your wallet offers it, and keep it as backup evidence, but keep your own ledger as the main record.

## The ledger: one line per payment

Here is the layout I'd use. It covers everything on HMRC's list plus the invoice link:

| Column | What goes in it | Why |
|---|---|---|
| Date received | The day the sats landed | HMRC's list: "date you received them" |
| Invoice no. | e.g. INV-0042 | Ties the payment to the work and the client |
| Client | Who paid | Your normal sales records |
| Amount invoiced (£) | The pounds total on the invoice | What was owed |
| Sats received | Exactly what arrived | HMRC's list: "number of tokens you received" |
| BTC/GBP rate | Price of 1 BTC in pounds that day | Needed to work out the value |
| Rate source | The site or service you took it from | HMRC wants your valuation method kept |
| Value received (£) | sats ÷ 100,000,000 × rate | HMRC's list: "value in pound sterling" |
| Running sats total | What you now hold | HMRC's list: "number of tokens you have in total" |
| Wallet / address | Where it was paid to | Audit trail for an enquiry |

The rate source column matters more than it looks. HMRC's manual doesn't tell you which price to use. It says "reasonable care should be taken to arrive at an appropriate valuation for the transaction using a consistent methodology" and that "details of the valuation methodology should be kept" ([HMRC Cryptoassets Manual, CRYPTO23000](https://www.gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto23000)). Pick one reputable source, use it every time, and write down which one it is. Don't switch to whichever price suits you on the day.

## Worked example: three invoices in one tax year

All rates below are illustrative, to show the arithmetic. They are not real or current prices.

| Date received | Invoice | Invoiced (£) | Sats received | Rate (1 BTC) | Value received (£) | Running sats |
|---|---|---|---|---|---|---|
| 10 Nov 2026 | INV-0042 | 1,200.00 | 1,500,000 | £78,000 | 1,170.00 | 1,500,000 |
| 2 Dec 2026 | INV-0043 | 450.00 | 540,000 | £84,000 | 453.60 | 2,040,000 |
| 15 Jan 2027 | INV-0044 | 800.00 | 1,000,000 | £80,000 | 800.00 | 3,040,000 |

How each "value received" figure is worked out:

> 1,500,000 ÷ 100,000,000 × £78,000 = £1,170.00

Notice the first two lines. INV-0042 was priced at £1,200, sats were calculated at the rate on the day it was issued, and by the time the client paid, the price had dropped, so the sats were worth £1,170. INV-0043 went the other way. That gap is normal when you invoice in pounds and get paid in sats, and it's exactly why you record both figures rather than just one.

Which figure goes into your accounts, and how any difference is treated, is a question for your accountant, and it depends partly on your accounting basis. For sole traders, the cash basis became the default method of calculating trading profits from the 2024 to 2025 tax year, with an election to opt out and use accruals instead ([GOV.UK](https://gov.uk/government/publications/expanding-the-income-tax-cash-basis-for-self-employed-individuals-and-partnerships/expanding-the-cash-basis)). Either way, a ledger with both columns gives them what they need.

If you'd rather avoid the gap altogether, re-price the invoice at the day's rate just before the client pays. I covered the options in [how to invoice a client in bitcoin](/blog/how-to-invoice-a-client-in-bitcoin-uk).

## Receiving sats and spending sats are two different records

This is the part most freelancers miss. There are two separate events, and both need a record:

| | When you **receive** sats for work | When you later **spend, sell or swap** them |
|---|---|---|
| What HMRC looks at | The pounds value when you received them | Any gain since you got them |
| Which tax | Income Tax, as part of your trading profits if you're trading | Capital Gains Tax, if the gain is over your allowance |
| What to record | The ledger above | Date, sats disposed of, sats left, pounds value |
| HMRC source | [Receiving cryptoassets](https://www.gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-receive-cryptoassets), [CRYPTO40350](https://www.gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto40350) | [Selling cryptoassets](https://gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-sell-cryptoassets) |

On the income side, HMRC's business manual says that if exchange tokens are held as part of an existing trade, "profits of a revenue nature will need to be included in the trading profits", and its example is a business that "accepts exchange tokens as payment from customers" ([HMRC Cryptoassets Manual, CRYPTO40350](https://www.gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto40350)).

On the disposal side, HMRC lists "using tokens to pay for goods or services" as a disposal, alongside selling and exchanging them ([HMRC](https://gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-sell-cryptoassets)). So paying a supplier in sats, or buying something with the sats a client sent you, belongs in your disposal records. HMRC also expects you to group each type of token into a "pool" to work out costs, with special rules for tokens bought on the same day as, or within 30 days of, a sale. The Capital Gains Tax annual exempt amount for individuals is £3,000 for both 2025 to 2026 and 2026 to 2027 ([GOV.UK](https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances)).

If you simply hold the sats, there's no disposal yet. But keep the receipt records, because they're the starting point when you eventually do spend or sell.

## How long to keep the records

If you're self-employed: "You must keep your records for at least 5 years after the 31 January submission deadline of the relevant tax year" ([GOV.UK](https://www.gov.uk/self-employed-records/how-long-to-keep-your-records)).

Here's what that means for the payments in the example above:

| Payments received in tax year | Self Assessment deadline | Keep records until at least |
|---|---|---|
| 6 Apr 2026 to 5 Apr 2027 | 31 Jan 2028 | 31 Jan 2033 |
| 6 Apr 2027 to 5 Apr 2028 | 31 Jan 2029 | 31 Jan 2034 |

Keep the bitcoin ledger with the rest of your business records, not in a separate notes app on your phone.

## Does Making Tax Digital change any of this?

It might. From 6 April 2026, you need to use Making Tax Digital for Income Tax if "your total annual income from self-employment and property is over £50,000", where qualifying income is your total before expenses, based on the tax return you submitted the previous year ([GOV.UK](https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax)). If that's you, you need "software that works with Making Tax Digital for Income Tax", and HMRC's guidance covers creating digital records and sending quarterly updates, so your sats payments need to end up in that software too, in pounds. A clean ledger like the one above makes that a copy-and-paste job rather than an archaeology project.

If your total trading income is small, the £1,000 trading allowance may apply. HMRC says that if your annual gross income from self-employment and similar sources is £1,000 or less, you do not need to tell HMRC, with some exceptions ([GOV.UK](https://gov.uk/guidance/tax-free-allowances-on-property-and-trading-income)). Keep the records anyway; you may need them to show you were under the limit.

## Exchanges are now reporting to HMRC

If you convert sats to pounds through a UK exchange, expect HMRC to see it. Under the Cryptoasset Reporting Framework, UK cryptoasset service providers have to send HMRC details of their users and their activity, with the first report, covering 1 January to 31 December 2026, due by 31 May 2027 ([GOV.UK](https://www.gov.uk/guidance/reporting-cryptoasset-user-and-transaction-data)). Your own records are how you show the numbers on your return match.

## A five-minute routine for every payment

1. When the sats land, open your ledger.
2. Add the date, invoice number, client and sats received.
3. Look up the BTC/GBP rate for that day from your usual source and note it.
4. Work out the pounds value and update your running total.
5. Mark the invoice paid, and file the invoice PDF with the ledger.

Do it on the day. Reconstructing rates for a dozen payments the night before 31 January is miserable.

## Doing it without the spreadsheet

I built [SatInvoice](/#app) partly to take steps 3 and 4 off my hands. When you mark an invoice as paid, it records that day's rate and shows what the sats were worth in pounds at the time of payment, next to the pounds amount you invoiced. You still need to keep your records, but the numbers HMRC asks for are already written down. Your first invoices are free. The [FAQ](/faq) explains how payments and re-pricing work in the app.

*This guide is general information, not tax advice.*
