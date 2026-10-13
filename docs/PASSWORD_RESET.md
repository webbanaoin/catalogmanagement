# Password Reset

## Supported accounts

The same secure password-reset flow supports:

- Merchant accounts
- Platform administrator accounts
- Marketing partner accounts

Entry points:

- Main login: `/login`
- Partner login: `/partner/login`
- Forgot password: `/forgot-password`
- Reset password: `/reset-password?token=...`

## Security model

Password reset tokens are:

- generated with 32 random bytes
- stored only as SHA-256 hashes
- valid for 30 minutes
- single-use
- invalidated when a newer reset request is created
- never stored or logged in plaintext

A successful reset:

- consumes the token atomically
- hashes and stores the new password
- increments `User.sessionVersion`
- invalidates all existing authenticated sessions
- consumes any other outstanding reset tokens for that user
- writes `PASSWORD_RESET_COMPLETED` to the audit log
- clears the current browser session cookie

The forgot-password response is generic for existing and unknown accounts to avoid exposing whether an email is registered.

## Email delivery

Production email delivery uses the Resend HTTP API and requires:

```
RESEND_API_KEY=...
PASSWORD_RESET_FROM_EMAIL=Webbanao Digital Showroom <no-reply@your-verified-domain.com>
PASSWORD_RESET_REPLY_TO=optional-support@your-domain.com
PASSWORD_RESET_EXPOSE_URL=false
```

The sender domain/address must be verified in Resend.

No email API secret is exposed to the browser.

## Local development

When running `npm run dev`, the forgot-password response includes a development reset URL and the UI shows **Open password reset page**.

This allows local testing without sending real email.

## CI testing

CI runs the production server but sets:

```
PASSWORD_RESET_EXPOSE_URL=true
```

This is permitted only in the isolated CI workflow so regression tests can retrieve the generated reset link without making external email requests.

Production preflight rejects this value if it is enabled.

## Production preflight

`npm run release:preflight` requires:

- `RESEND_API_KEY`
- `PASSWORD_RESET_FROM_EMAIL`
- `PASSWORD_RESET_EXPOSE_URL` not equal to `true`

It also rejects the example sender domain.

## Regression coverage

```
npm run test:auth:password-reset
```

The regression verifies:

- forgot-password request succeeds
- existing and unknown email responses do not disclose account existence
- reset token is usable once
- reused token is rejected
- previous authenticated session is revoked
- old password stops working
- new merchant password works
- marketing partner reset works with partner login
- reset completion creates an audit record
- forgot/reset pages render successfully
