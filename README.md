# John Zarcaro — Cryptocurrency Educator Website

Static GitHub Pages website for John Zarcaro, Cryptocurrency Educator for the Digital Age.

## Files

- `index.html` — main landing page
- `contract.html` — Scope of Services Agreement page
- `schedule.html` — live Proton intro-call booking page
- `manage-booking.html` — reschedule/cancellation page that prepares a customer-controlled email to the dedicated Proton scheduling address
- `pay.html` — agreement-first payment process page
- `complete.html` — appointment confirmation and next steps page
- `styles.css` — site design system and responsive layout
- `assets/logo.svg` — purple and digital-gold education logo
- `scripts/validate-site.mjs` — dependency-free checks for page structure, accessibility basics, local links, canonical URLs, and approved service copy

Run `node scripts/validate-site.mjs` before publishing. The same validation runs automatically for pull requests and pushes to `main` or a `codex/**` branch.

## GitHub Pages setup

The live public site is built from the `main` branch and root folder. Review and approve changes before merging them into `main`.
