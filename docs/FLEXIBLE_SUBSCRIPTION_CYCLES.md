# Flexible Subscription Billing Cycles

## Purpose

Digital Showroom supports four merchant-facing paid billing cycles:

- Monthly
- Quarterly
- Half-Yearly
- Yearly

Pricing and referral commissions are controlled by Webbanao admin and are not hard-coded into the public or merchant UI.

## Launch defaults

The approved launch defaults are:

| Cycle | Total price | Effective monthly | Referral commission |
| --- | ---: | ---: | ---: |
| Monthly | ₹299 | ₹299 | ₹50 |
| Quarterly | ₹837 | ₹279 | ₹125 |
| Half-Yearly | ₹1,614 | ₹269 | ₹250 |
| Yearly | ₹2,988 | ₹249 | ₹500 |

These values are migration initialization only. Admin can change them later without a code deployment.

## Database source of truth

Plan pricing:

- `plans.monthly_price`
- `plans.quarterly_price`
- `plans.half_yearly_price`
- `plans.annual_price`

Referral earnings:

- `referral_program_settings.monthly_commission`
- `referral_program_settings.quarterly_commission`
- `referral_program_settings.half_yearly_commission`
- `referral_program_settings.yearly_commission`

The shared application mapping is in:

`src/lib/subscription-cycles.ts`

It owns the merchant-facing paid cycles, display labels, month counts, default validity-extension days, price-field mapping and commission-field mapping.

## Subscription validity defaults

- Monthly: 30 days
- Quarterly: 90 days
- Half-Yearly: 182 days
- Yearly: 365 days

Admin can still adjust extension days on a direct payment when an exceptional/manual adjustment is required.

Weekly and Custom remain available in admin payment/reporting infrastructure but are not merchant-facing subscription choices and do not earn referral commission.

## Admin pricing workflow

Admin -> Plans controls all four prices for a plan.

Changing a configured price affects future/displayed pricing in:

- public landing pricing section
- merchant Subscription page
- merchant Payments form
- admin direct Payment form auto-fill

Admin can manually adjust the amount when recording an actual payment so discounts/adjustments remain possible. The official PaymentRecord stores the actual amount received.

## Admin referral workflow

Admin -> Referrals controls four independent commission rates.

Changing a commission rate affects future eligible payments and the public/partner current-rate display.

Historical ReferralCommission records contain their earned amount snapshot and are never recalculated when current settings change.

## Landing page

The public landing page reads the active default/commercial Plan from the database and calculates:

- total amount payable
- effective monthly price
- saving versus paying the Monthly rate for the equivalent duration

The referral section reads ReferralProgramSettings directly and displays the current admin-configured rates.

No deployment is required for pricing or commission changes.

## Merchant payment workflow

Merchant -> Payments offers exactly:

- Monthly
- Quarterly
- Half-Yearly
- Yearly

Selecting a cycle auto-fills that shop's current Plan price.

Merchant submissions still follow:

Pending -> Admin verification -> Approved/Rejected

Only Approved submissions create an official PaymentRecord, extend subscription validity, and trigger any applicable referral commission.

## Admin payment workflow

Admin -> Payments continues to support its broader BillingCycle enum for reporting/manual accounting, but for the four standard subscription cycles it auto-fills the selected shop's current Plan amount and shared default extension days.

Actual received amount remains editable before saving.

## Referral eligibility

Referral commission is eligible only for the four merchant paid cycles.

For FIRST_PAID_SUBSCRIPTION mode, all four cycles belong to one paid-subscription family. Example: if the first eligible referred payment was Quarterly, a later Yearly payment is not treated as another first payment.

For EVERY_ELIGIBLE_PAYMENT mode, each eligible Monthly/Quarterly/Half-Yearly/Yearly payment can generate the commission configured for its cycle.

## Historical integrity

Plan-price edits never change old PaymentRecord amounts.

Referral-rate edits never change old ReferralCommission amounts.

This preserves correct financial history even when Webbanao changes future commercial pricing.

## Migration

`20261010040000_flexible_subscription_cycles`

The migration:

- adds Quarterly and Half-Yearly plan prices
- adds Quarterly and Half-Yearly referral commission rates
- initializes untouched/default installations with approved launch values
- preserves existing admin-configured Monthly/Yearly values
