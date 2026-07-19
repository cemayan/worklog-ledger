# Roadmap

Working plan for the 2-week MVP. Check items off as they land.

## Done

- [x] Session-reuse auth PoC, validated against a live Jira Cloud site (`poc/`)
- [x] MV3 skeleton: Vite + TypeScript + Preact, popup + full-page app
- [x] Jira client: session auth primary, API-token fallback in the data layer, typed auth errors
- [x] Weekly calendar (read): my worklogs per day via `search/jql` + per-issue worklog API
- [x] Write flow: "+ Log work" dialog (issue autocomplete, duration parser, start time,
      comment), staged drafts in `chrome.storage.local`, push bar with per-entry
      visible error handling
- [x] Edit and delete existing worklogs (PUT/DELETE on the worklog endpoints)
- [x] Copy last week / duplicate an entry onto another day (shared WorklogDialog,
      duplicates staged as drafts)
- [x] API-token fallback UI: settings panel (site, session/token auth, email + token),
      "Open settings" CTA on auth errors incl. token expiry
- [x] Loading skeleton, empty-week hint, per-day target progress bar (configurable
      daily target, weekdays only)
- [x] Basic keyboard navigation on the grid (←/→ between days with week wrap,
      Enter = log work)

## Week 1 — remaining (free tier)

- (done — see above)

## Week 2 — paid tier + release

- [x] Report engine: date-range, entry-level aggregation grouped by client/project/person
      (epic grouping deferred; parentKey already fetched)
- [x] Client mapping (project → client) + hourly rates + billable flag (stored in
      `chrome.storage.sync`), default rate + currency
- [x] Invoice-ready CSV export (hours × rate, entry-level, totals row, Excel-friendly
      BOM/CRLF) — dedicated Excel .xlsx deferred
- [x] ExtensionPay integration (code side) — `extpay` wired in `lib/license.ts` with
      lazy import + cached-paid fallback, background worker, Upgrade buttons; reverse
      trial 14 days full → export/rates lock
- [x] Icons (16/48/128, generated from SVG), CWS listing draft (`store/listing.md`),
      privacy policy + landing page (`site/`, ready for GitHub Pages)
- [ ] BLOCKER: payment account — ExtensionPay needs a Stripe account (not available
      to Turkey-based individuals). Decide: foreign entity w/ Stripe vs Lemon
      Squeezy/Paddle (merchant of record). Then register the extension id and update
      `EXTPAY_ID`.
- [x] Publish site/ to GitHub Pages (gh-pages branch) — live at
      https://cemayan.com/worklog-ledger/ (privacy: /worklog-ledger/privacy.html)
- [ ] Fill support email in privacy.html + listing before CWS submit
- [ ] Screenshots 1280×800 for CWS (calendar light/dark, report, export)
- [ ] Submit to CWS early (manual review can take 3+ weeks)

## Later (post-MVP, sales-driven)

- [ ] Tempo interop: read worklogs from the Tempo API (top unanswered gap in the
      incumbent free extension)
- [ ] PDF export; QuickBooks/Xero-friendly CSV formats
- [ ] Timer (only if users ask — calendar-first is the positioning)
- [ ] Jira Data Center support

## Validation gates

- Gate 1 (done): session-reuse auth works → architecture confirmed
- Gate 2 (launch + 4 weeks): ≥ ~200 organic installs and report-feature clicks;
  otherwise invest in channels (Atlassian Community, r/jira)
- Gate 3 (launch + 8 weeks): first 5 paying users; otherwise change pricing/packaging
  or pivot to the release-notes idea on the same Jira REST base
