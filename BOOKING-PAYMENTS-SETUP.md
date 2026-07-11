# Booking and Payments Setup

This site is a static GitHub Pages website. It does not run a payment backend, store card data, send SMS directly, or verify payment status. Booking and payment operations are handled by hosted third-party services.

## A. Website work Codex completed

- Added public integration configuration in `js/integration-config.js`.
- Added integration behavior in `js/integrations.js` to:
  - read public Calendly URLs from `window.JOHN_SITE_INTEGRATIONS`;
  - require configured URLs to use `https`;
  - attach configured URLs to links using data attributes;
  - avoid injecting HTML from URL values;
  - use the existing booking request form as a visitor-safe fallback when URLs are blank;
  - avoid exposing credentials;
  - open direct paid booking links with `target="_blank"` and `rel="noopener noreferrer"`;
  - log concise browser-console warnings for missing development configuration.
- Updated `schedule.html` with a Calendly intro-call embed area that remains hidden until `calendlyIntroUrl` is configured.
- Kept the existing request form visible as the fallback booking path.
- Added a direct paid-session call to action that uses the configured paid Calendly event link when available.
- Rebuilt `pay.html` around hosted payment paths:
  - $249 paid session through Calendly with Stripe payment required inside Calendly;
  - $799 package through client-specific Stripe invoices unless Calendly Meeting Packages is later configured;
  - custom services through client-specific Stripe invoices.
- Updated `complete.html` so it works as a general post-booking or post-payment next-step page without claiming payment success from URL parameters.

## B. Account configuration the owner must complete manually

The owner must complete the following steps in Calendly and Stripe. Do not commit private URLs, tokens, API keys, phone numbers, or private email addresses to the repository.

## Public website configuration

After the Calendly event types are created, update only the public URL values in `js/integration-config.js`:

```js
window.JOHN_SITE_INTEGRATIONS = Object.freeze({
  calendlyIntroUrl: "https://calendly.com/.../free-intro-call",
  calendlyPaidSessionUrl: "https://calendly.com/.../private-crypto-education-session",
  calendlyPackageUrl: "",
  bookingFallbackUrl: "schedule.html",
  agreementUrl: "contract.html"
});
```

- `calendlyIntroUrl` is the free 20–30 minute intro-call event.
- `calendlyPaidSessionUrl` is the direct Calendly link for the $249, up-to-90-minute private cryptocurrency education session. Stripe payment must be required inside Calendly.
- `calendlyPackageUrl` is optional. Use it only if Calendly Meeting Packages is available and configured correctly. Otherwise leave it blank and use Stripe invoices manually.
- Do not add Stripe invoice URLs. Invoices are unique to each approved client.

## Calendly setup

Use a Calendly Standard plan or higher.

1. Connect the owner’s Google Calendar or Outlook calendar.
2. Connect the owner’s Stripe account.
3. Create event type:

   **Free Intro Call**

   - Duration: 20 or 30 minutes
   - Payment: free

4. Create event type:

   **Private Cryptocurrency Education Session**

   - Duration: 90 minutes
   - Price: $249 USD
   - Require Stripe payment to complete booking
   - Use a private or controlled event link if desired

5. Add booking questions:

   - What would you like help understanding?
   - Which service interests you?
   - Preferred meeting method
   - Phone number, optional
   - Have you reviewed the service scope and agreement?

Do **not** ask clients for:

- passwords
- seed phrases
- private keys
- authentication codes
- wallet recovery details
- account credentials

## Calendly owner alert workflows

Configure these Calendly Workflows so the owner receives booking alerts without adding SMS code or private credentials to the website.

### Workflow 01 — New Booking Owner Alert

Trigger:

- New event is booked

Actions:

- Send email to host immediately
- Send text message to host immediately

Suggested SMS:

```text
New booking: {{invitee_full_name}} — {{event_name}} — {{event_start_time}}. Check Calendly/email for details.
```

### Workflow 02 — Reschedule Owner Alert

Trigger:

- Event is rescheduled

Actions:

- Email host
- Text host

Suggested SMS:

```text
Rescheduled: {{invitee_full_name}} — {{event_name}} — new time {{event_start_time}}.
```

### Workflow 03 — Cancellation Owner Alert

Trigger:

- Event is canceled

Actions:

- Email host
- Text host

Suggested SMS:

```text
Canceled: {{invitee_full_name}} — {{event_name}} — {{event_start_time}}.
```

## Client reminder workflows

Optional client Workflows:

- Email confirmation when booked
- Email reminder 24 hours before
- Text reminder 2 hours before, only for clients who opt in
- Follow-up email after the meeting

Invitees must consent to receive Calendly SMS messages.

## Stripe setup

1. Complete Stripe identity and business verification honestly.
2. Describe the business as private educational services.
3. State clearly:
   - no cryptocurrency exchange
   - no wallet custody
   - no brokerage
   - no trade execution
   - no staking or mining services
   - no trading signals
   - no personalized investment advice
4. Connect Stripe to Calendly.
5. Enable successful-payment notifications for the owner.
6. Enable successful-payment receipts for customers.
7. Add business logo and purple branding in Stripe.
8. Set an accurate statement descriptor.
9. Add cancellation and refund information consistent with `contract.html`.

## Stripe invoices

Use Stripe Invoicing for services that should not use a public reusable checkout link.

- $799 package invoice one: $399.50 after agreement.
- $799 package invoice two: $399.50 before session two.
- Custom services: invoice based on written scope.
- Invoices should be sent only to the approved client.
- Do not use one reusable public link for arbitrary custom amounts.

## Business compliance note

> **Important:** Stripe may conduct additional review because the website discusses cryptocurrency. The business must be represented accurately as education only. The owner should not claim to be an exchange, wallet provider, broker, investment adviser, asset manager, recovery company, staking provider, or mining provider unless separately authorized and approved.

## Security requirements

- Do not commit Stripe secret keys.
- Do not commit Stripe webhook secrets.
- Do not commit Twilio credentials.
- Do not commit Calendly API tokens.
- Do not commit private phone numbers or private owner email addresses.
- Do not collect or process card information in the website.
- Do not send form data directly to Twilio from browser JavaScript.
- Do not create a fake payment-success state in `localStorage`.
- Do not trust URL parameters as proof of payment.
