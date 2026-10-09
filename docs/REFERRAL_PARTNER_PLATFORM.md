# Referral / Marketing Partner Platform

## Purpose

Webbanao can onboard marketing partners who refer merchants to Digital Showroom. Partners register separately, require admin approval, receive a unique referral code, and can track referred shops, earned commission and payout history.

## Roles and portals

- Merchant: `/register`, `/login`, `/dashboard`
- Platform admin: `/admin`
- Marketing partner: `/partner/register`, `/partner/login`, `/partner/dashboard`

Partner accounts reuse the secure User/session infrastructure but use the `PARTNER` platform role and a separate ReferralPartner lifecycle.

The public landing page includes an **Earn with Webbanao** section with current commission guidance, referral steps, Partner Registration and Partner Login entry points.

## Partner lifecycle

1. Partner self-registers with name, email, mobile, password and optional city/state/marketing area.
2. ReferralPartner is created in `PENDING`.
3. Admin reviews under **Admin -> Referrals**.
4. Approval changes status to `ACTIVE` and automatically generates a short unique referral code such as `WB-48271`.
5. Suspended/rejected partners cannot sign in or create valid new referral attribution.
6. Existing historical shops, commission and payout records remain preserved.

## Merchant attribution

Merchant registration accepts an optional referral code.

Referral links use:

```
/register?ref=<REFERRAL_CODE>
```

Priority is explicit registration/admin attribution only; no browser cookie attribution is used.

Admin can assign or remove an active partner from a shop until the shop has earned its first referral commission. After commission exists, attribution is locked to preserve financial history.

## Commission settings

Admin controls:

- program enabled/disabled
- monthly commission amount
- yearly commission amount
- commission mode:
  - `FIRST_PAID_SUBSCRIPTION`
  - `EVERY_ELIGIBLE_PAYMENT`

Amounts are stored in the database, not hard-coded in application logic.

Historical ReferralCommission rows contain snapshots of the commission amount, payment amount, partner identity/code, shop name and plan name. Changing current settings never rewrites historical commission.

Only MONTHLY and YEARLY billing cycles currently generate referral commission. Other billing cycles remain non-commissionable until explicitly added to the settings model.

## Payment integration

Commission creation happens inside the same database transaction as Admin Payment Management.

Payment -> eligibility check -> ReferralCommission

Safeguards:

- shop must have a referral partner
- partner must be ACTIVE with a referral code
- referral program must be enabled
- configured commission must be greater than zero
- first-paid mode verifies there was no previous shop payment
- `payment_record_id` is unique in ReferralCommission, preventing duplicate commission for one payment

## Payout lifecycle

ReferralCommission statuses:

- `EARNED`: pending payout
- `PAID`: admin has paid the partner
- `CANCELLED`: pending commission was cancelled with a reason

For a payout, admin records:

- Cash / UPI / Bank Transfer / Other
- paid date
- reference / UTR
- comment
- admin user who recorded the payout

Settled rows are not silently deleted. Audit logs preserve partner status changes, attribution changes, commission earning, payout and cancellation.

## Admin reporting

Admin -> Referrals includes:

- total customer collections
- referred-shop collections
- total commission earned
- commission paid
- commission pending
- net revenue after commission liability
- realized net cash after paid commission
- active and pending partner counts
- referred and paid shop counts
- partner-wise collections, earned/paid/pending commission and net revenue
- actual referred-shop list per partner
- filterable commission/payout ledger

## Partner dashboard

An approved partner can see:

- short referral code
- referral URL
- copy/share controls
- number of referred shops
- number of paid shops
- customer collections from referred shops
- commission earned
- commission paid
- pending payout
- current monthly/yearly commission configuration
- referred shop status/subscription summary
- commission and payout history

Merchant private account data and admin-only notes are not exposed.

## Database

New/updated structures:

- `users.platform_role`: adds `PARTNER`
- `referral_program_settings`
- `referral_partners`
- `shops.referral_partner_id`
- `shops.referral_assigned_at`
- `referral_commissions`

Migration:

```
20261009152000_referral_partner_platform
```

## Validation

Automated command:

```
npm run test:referrals
```

The CI regression verifies partner registration, pending approval, admin approval/referral-code generation, partner login, merchant referral attribution, admin-managed monthly/yearly commission amounts, first-paid-only duplicate prevention, payout recording, recurring-mode yearly commission, overview analytics and partner dashboard access.
