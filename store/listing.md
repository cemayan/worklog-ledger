# Chrome Web Store listing — Worklog Ledger for Jira

## Name
Worklog Ledger for Jira

## Summary (max 132 chars)
Fast weekly worklog calendar for Jira Cloud + client-ready billing reports. No server — your data stays in your browser.

## Category
Workflow & Planning

## Detailed description

Log work in a fast weekly calendar and turn Jira worklogs into client-ready billing
reports — without a server, a Marketplace app, or admin approval.

WEEKLY CALENDAR (FREE)
• See your worklogs on a Monday-to-Sunday grid with daily totals and a target bar
• Add, edit, duplicate and delete worklogs without leaving the page
• Copy last week onto this week in one click
• Stage entries locally, review, then push to Jira — failures are visible and
  retryable, nothing is lost silently
• Keyboard-first: arrow keys move between days, Enter logs work

BILLING REPORTS (PAID, 14-DAY FULL TRIAL)
• Pick any date range and pull every team member's worklogs, entry by entry
• Map Jira projects to clients, set hourly rates and billable flags
• Group totals by client, project or person
• Export an invoice-ready CSV (hours × rate) your client can audit

PRIVATE BY DESIGN
• Talks only to your Jira Cloud site (*.atlassian.net) from your own browser
• Uses your existing Jira session — or an API token you provide
• No backend, no analytics, no tracking; settings stay in extension storage
• Only the person running reports pays — not every Jira user on your site

Works with Jira Cloud. Not affiliated with Atlassian.

## Permission justifications (CWS review form)

- `storage` — persists the user's Jira site URL, preferences, client/rate mappings
  and locally staged worklogs.
- Host `https://*.atlassian.net/*` — calls Jira Cloud's REST API (worklogs, issue
  search) directly from the user's browser; this is the extension's single purpose.
- Host `https://extensionpay.com/*` — license/paid-status check for the paid tier.

## Data usage disclosures

- Does NOT collect or transmit user data to the developer. All Jira data stays
  between the user's browser and Atlassian. Payment email/status handled by
  ExtensionPay/Stripe.

## Assets checklist

- [ ] Icon 128×128 (public/icons/icon128.png — done)
- [ ] Screenshots 1280×800: calendar (light), calendar (dark), report, export dialog
- [ ] Small promo tile 440×280 (optional but boosts placement)
- [x] Privacy policy URL: https://worklogledger.cemayan.com/privacy.html
      (moved to dedicated subdomain after Paddle classified cemayan.com root as
      a personal blog)
- [ ] Support email / site URL

## Before submitting

- [ ] Decide payment provider (ExtensionPay requires a Stripe account — not
      available for Turkey-based individuals; alternative: Lemon Squeezy/Paddle
      as merchant of record)
- [ ] Register extension id on the payment provider; update EXTPAY_ID in
      src/lib/license.ts
- [ ] Bump version, `npm run build`, zip `dist/`
- [ ] Trademark check: name must not START with "Jira" ("… for Jira" is allowed)
