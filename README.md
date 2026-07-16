# John Zarcaro — Cryptocurrency Educator Website

Static GitHub Pages website for John Zarcaro, Cryptocurrency Educator for the Digital Age.

## Files

- `index.html` — main landing page
- `contract.html` — Scope of Services Agreement page
- `schedule.html` — intro call lead page
- `pay.html` — fixed-price Stripe Payment Link checkout page
- `complete.html` — appointment confirmation and next steps page
- `styles.css` — site design system and responsive layout
- `assets/logo.svg` — purple and digital-gold education logo
- `CNAME` — custom domain configuration for `jaz.llc`

## Payment page

- `pay.html` provides fixed-price service buttons that redirect to Stripe-hosted Payment Links after the real links are supplied.
- Stripe Payment Links must be created in John’s Stripe account.
- The public GitHub Pages site never processes or stores payment information.
- Secret or restricted Stripe keys must never be committed to this repository.
- The three placeholder checkout locations must be replaced with approved `https://buy.stripe.com/` URLs before enabling checkout.
- Custom education payments are provided individually after the scope and price are agreed to.

## GitHub Pages setup

Use GitHub Pages with the `main` branch and root folder.
