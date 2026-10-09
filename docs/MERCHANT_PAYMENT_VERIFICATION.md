# Merchant Payment Submission & Verification

## Goal

Keep one consistent payment history visible to both Webbanao admin and the merchant, regardless of how the merchant paid:

- directly to Webbanao
- through the shop's assigned marketing/referral partner
- through another agreed person or payment medium

Merchant-entered payment information is **not** treated as received money until an admin verifies it.

## Merchant flow

Merchant dashboard -> **Payments**

The merchant can see:

- total verified payments
- pending self-submitted payment claims
- current monthly, quarterly, half-yearly and yearly plan prices
- complete verified payment history
- all submitted claims with Pending / Approved / Rejected status
- admin rejection/review comment

The merchant can submit:

- amount paid
- payment date
- Monthly, Quarterly, Half-Yearly or Yearly billing cycle
- Cash / UPI / Bank Transfer / Other
- paid to:
  - Webbanao / Direct
  - assigned referral/marketing partner
  - another person / medium
- UTR / transaction / receipt reference
- note

A merchant payment submission starts as `PENDING`.

## Admin flow

Admin -> **Payments** -> Merchant submitted payments

Admin can review:

- shop
- amount
- payment date
- Monthly / Quarterly / Half-Yearly / Yearly cycle
- payment method
- who the merchant says received the money
- merchant identity
- UTR/reference
- merchant note

Admin actions:

### Approve

Approval creates the official `PaymentRecord` and, in the same financial workflow:

- marks the submission `APPROVED`
- links it to the official PaymentRecord
- updates subscription payment status
- activates/extends subscription validity
- creates applicable referral commission
- writes audit logs

Default subscription extensions are Monthly 30 days, Quarterly 90 days, Half-Yearly 182 days and Yearly 365 days. Admin can adjust extension days before approval.

### Reject

Rejection:

- marks the submission `REJECTED`
- creates no PaymentRecord
- changes no subscription/revenue
- creates no referral commission
- stores the rejection reason
- makes the reason visible to the merchant

## Direct admin payment

If Webbanao receives payment directly and admin records it through the existing **Record shop payment** form, no merchant submission is required.

That official payment automatically appears in the merchant's **Verified payment history** as:

`Recorded directly by Webbanao`

## Approved merchant submission

An approved merchant claim appears in merchant verified history as:

`Submitted by you · approved by Webbanao`

The original "paid to" recipient remains visible.

## Duplicate safeguards

- Merchant cannot submit a UTR/reference already present in an official shop payment.
- Merchant cannot submit the same UTR/reference while another Pending/Approved claim already exists.
- Admin direct payment cannot reuse an existing official reference.
- If the same reference exists in a Pending merchant claim, admin is directed to approve that claim instead of creating a duplicate payment.

## Security / financial integrity

- Only shop OWNER/MANAGER roles can access merchant payment finance APIs.
- A Pending merchant claim does not count as revenue.
- A Pending merchant claim does not activate subscription validity.
- A Pending merchant claim does not earn referral commission.
- Approval is atomic with official payment creation.
- Concurrent/repeated review is protected by the submission status transition and one-to-one PaymentRecord link.
- Historical claims and review comments remain auditable.

## Database

New model:

`PaymentSubmission`

Key fields:

- shop
- submitted/reviewed users
- amount/method/cycle/date
- recipient type/name
- reference/note
- Pending/Approved/Rejected status
- linked official PaymentRecord
- optional linked referral partner
- review date/comment

Migration:

`20261010013000_merchant_payment_submissions`

## Automated validation

```
npm run test:merchant:payments
```

The regression covers merchant submission, Pending isolation, admin approval, official merchant-visible history, referral commission creation, duplicate-reference protection, admin-direct payment visibility and rejection reason visibility.


## Pagination and navigation

Growing payment records are loaded server-side in bounded pages:

- Merchant payment submissions: 10 per page
- Merchant verified payment history: 10 per page
- Admin merchant payment verification queue: 20 per page
- Admin official payment history: 25 per page

Changing filters resets the affected list to page 1. Summary totals remain account/filter totals rather than totals for only the visible page.

The merchant desktop sidebar is viewport-sticky and keeps Logout visible without requiring the user to scroll to the end of a long page. The admin header is sticky as well, keeping Admin Logout accessible while reviewing long operational lists.
