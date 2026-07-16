# Private payment-link system

## Existing stack discovered

- Framework/language: static HTML/CSS/JS site, now extended by a minimal Node.js/Express server so existing pages remain served from the repository root.
- Routing: static files such as `index.html`, `pay.html`, and `schedule.html`; new server routes add `/admin/payments`, `/pay/:token`, `/pay/:token/status`, `/api/payments/:token/checkout`, and `/api/stripe/webhook`.
- Database: no prior database was present. The payment system uses SQLite through `better-sqlite3` with migrations in `lib/db.js`.
- Authentication: no prior authentication was present. The payment system adds an admin login with Argon2 password hashes, HTTP-only SameSite cookies, CSRF tokens on admin writes, and rate limiting.
- Deployment: README described GitHub Pages. Dynamic payments require deploying the Node server on a platform that supports persistent environment variables and a durable SQLite volume or replacing SQLite with the host's managed database.
- Stripe: no prior Stripe SDK/configuration was present. Stripe Checkout and webhook handling were added server-side only.
- Email/SMS: no existing transactional email or SMS provider was found, so sending email/SMS was not implemented.
- Design: existing `styles.css` and `carlsbad-polish.css` classes are reused for admin and client payment pages.

## Database migration

Run:

```bash
npm run db:migrate
```

This creates `admins`, `sessions`, `payment_requests`, `payment_attempts`, `stripe_webhook_events`, and `audit_logs`.

## Required environment variables

Copy `.env.example` to `.env` and set real deployment values. Use Stripe test keys locally and never commit real keys.

- `APP_BASE_URL`
- `PORT`
- `DATABASE_PATH`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_INITIAL_PASSWORD` for first admin creation only
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMENT_MIN_CENTS`
- `PAYMENT_MAX_CENTS`
- `PAYMENT_HIGH_VALUE_CONFIRM_CENTS`
- `CARD_PAYMENT_MAX_CENTS`

## First administrator

```bash
npm run db:migrate
ADMIN_EMAIL=attorney@example.com ADMIN_INITIAL_PASSWORD='replace-with-long-one-time-password' npm run admin:create
```

Rotate/remove `ADMIN_INITIAL_PASSWORD` from the production environment after the admin is created.

## Stripe Dashboard configuration

1. Use test mode first.
2. Enable Checkout and the `card` and `us_bank_account` payment methods for the account.
3. Add webhook endpoint: `https://johnzarcaro.com/api/stripe/webhook`.
4. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_intent.processing`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
5. Store the signing secret in `STRIPE_WEBHOOK_SECRET`.

## Local development and tests

```bash
npm install
npm run db:migrate
npm run admin:create
npm run dev
stripe listen --forward-to localhost:3000/api/stripe/webhook
npm test
npm run build
```

## Production deployment

GitHub Pages alone cannot run the private payment portal because it needs server-side Stripe keys, sessions, webhooks, and a database. Deploy the Node application to a server-capable host, set `APP_BASE_URL=https://johnzarcaro.com`, configure HTTPS, configure a persistent database path/volume or managed database adaptation, run migrations, create the admin, and point DNS/proxy traffic to the Node service.

## Admin flow

The attorney signs in at `/admin/login`, opens `/admin/payments`, confirms trust/operating-account treatment, creates a fixed-amount request, copies the one-time private link, monitors status/history fields, and can revoke active links.

## Client flow

The client opens `/pay/<token>`, sees only client name, amount, neutral reference, short description, expiration, Stripe safety copy, and the allowed ACH/card choices. The browser only submits the selected method. Stripe-hosted Checkout collects payment details. `/pay/<token>/status` shows database-backed status and receipt details after verified success.

## Trust-account and banking decisions still required

The implementation does not decide whether funds belong in an operating account or client trust account and does not perform automatic account routing. Before production use, the attorney must confirm which payment categories may be deposited into the configured Stripe/bank account and whether Stripe fees, settlement timing, and bank-account setup satisfy applicable California trust-account obligations.

## Production-readiness note

Do not treat this as production-ready until test-mode Checkout, verified webhooks, link expiration, link revocation, and asynchronous ACH success/failure status changes have all been validated on the target host.

## Split frontend/backend deployment

This repository includes deployment scaffolding for a split deployment:

- `vercel.json` serves the static frontend from Vercel and rewrites `/admin/*`, `/api/*`, and `/pay/*` to the backend host.
- `Dockerfile` and `render.yaml` deploy the Node/Express backend to Render with a persistent SQLite disk.

Before deploying the Vercel frontend, replace `https://REPLACE_WITH_BACKEND_HOST` in `vercel.json` with the actual backend URL assigned by the backend host. Set the backend `APP_BASE_URL` to the final public frontend URL if Vercel proxies the payment/admin routes, or to the backend URL if those routes are accessed directly.
